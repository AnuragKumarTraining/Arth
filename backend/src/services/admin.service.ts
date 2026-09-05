import type { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { customers, accounts, branches, transactions, beneficiaries } from '../db/schema';
import { AppError } from '../error/AppError';
import { emailService } from './email.services';
import { updateAccountInput, UpdateCustomerDetailsInput } from '../validator/admin.validator';
import { eq, or, desc, and, sql, lt, gte, lte, asc, count, ilike } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { GenerateStatementParams, GetStatementDataParams, StatementData, StatementTransaction } from '../types/statements.types';
import { generateStatementPdf } from './statement.pdf.service';
import { loans } from '../db/schema/loans';

export class AdminService {
  private editOtpStore = new Map<
    number,
    {
      hashedOtp: string;
      expiresAt: Date;
      resendAvailableAt: Date;
      failedAttempts: number;
      isUnlocked: boolean;
      unlockedExpiresAt?: Date;
    }
  >();

  async listUsers(params: { page?: number; limit?: number; search?: string; kycStatus?: string } = {}) {
    const requestedPage = params.page;
    const requestedLimit = params.limit;
    const page = Number.isInteger(requestedPage) && requestedPage! > 0 ? requestedPage! : 1;
    const limit = Number.isInteger(requestedLimit) && requestedLimit! > 0
      ? Math.min(requestedLimit!, 100)
      : 10;
    const search = params.search?.trim();
    const searchFilter = search
      ? or(
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
        ilike(customers.email, `%${search}%`),
        ilike(customers.phoneNumber, `%${search}%`),
        ilike(accounts.accountNumber, `%${search}%`),
        sql`CAST(${customers.id} AS TEXT) ILIKE ${`%${search}%`}`,
      )
      : undefined;
    const statusFilter = params.kycStatus && params.kycStatus !== 'ALL'
      ? eq(customers.kycStatus, params.kycStatus)
      : undefined;
    const filters = searchFilter && statusFilter
      ? and(searchFilter, statusFilter)
      : searchFilter ?? statusFilter;

    const [totalResult, users] = await Promise.all([
      db
        .select({ total: count() })
        .from(customers)
        .leftJoin(accounts, eq(customers.id, accounts.customerId))
        .where(filters),
      db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phoneNumber: customers.phoneNumber,
          dateOfBirth: customers.dateOfBirth,
          nationalId: customers.nationalId,
          address: customers.address,
          kycStatus: customers.kycStatus,
          isActive: customers.isActive,
          createdAt: customers.createdAt,
          customerId: accounts.customerId,
          accountNumber: accounts.accountNumber,
          accountType: accounts.accountType,
        })
        .from(customers)
        .leftJoin(accounts, eq(customers.id, accounts.customerId))
        .where(filters)
        .orderBy(desc(customers.createdAt), desc(customers.id))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);

    const total = Number(totalResult[0]?.total ?? 0);
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendCustomerEditOtp(customerId: number) {
    const customerList = await db
      .select({ id: customers.id, email: customers.email, firstName: customers.firstName })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (customerList.length === 0) {
      throw new AppError(404, 'Customer record not found');
    }

    const customer = customerList[0];
    const existingOtp = this.editOtpStore.get(customerId);
    const now = Date.now();

    if (existingOtp && now < existingOtp.resendAvailableAt.getTime()) {
      const waitSec = Math.ceil((existingOtp.resendAvailableAt.getTime() - now) / 1000);
      throw new AppError(429, `Please wait ${waitSec} seconds before requesting a new OTP.`);
    }

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const expiresAt = new Date(now + 5 * 60 * 1000);
    const resendAvailableAt = new Date(now + 30 * 1000);

    this.editOtpStore.set(customerId, {
      hashedOtp,
      expiresAt,
      resendAvailableAt,
      failedAttempts: 0,
      isUnlocked: false,
    });

    console.info(`[AdminService:sendCustomerEditOtp] Dispatching OTP for customer edit to registered email: ${customer.email}`);
    await emailService.sendOtpEmail(customer.email, rawOtp);

    return {
      success: true,
      message: `OTP sent successfully to customer's registered email (${customer.email}).`,
    };
  }

  async verifyCustomerEditOtp(customerId: number, otp: string) {
    const otpRecord = this.editOtpStore.get(customerId);
    const now = Date.now();

    if (!otpRecord || now > otpRecord.expiresAt.getTime()) {
      if (otpRecord) this.editOtpStore.delete(customerId);
      throw new AppError(400, 'INVALID_OR_EXPIRED_OTP');
    }

    if (otpRecord.failedAttempts >= 3) {
      this.editOtpStore.delete(customerId);
      throw new AppError(429, 'MAXIMUM_ATTEMPTS_REACHED');
    }

    const hashedInputOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const inputBuf = Buffer.from(hashedInputOtp, 'hex');
    const storedBuf = Buffer.from(otpRecord.hashedOtp, 'hex');
    const isOtpValid = inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);

    if (!isOtpValid) {
      otpRecord.failedAttempts += 1;
      throw new AppError(400, 'INVALID_OR_EXPIRED_OTP');
    }

    // Marks edit session as unlocked for 15 minutes.
    otpRecord.isUnlocked = true;
    otpRecord.unlockedExpiresAt = new Date(now + 15 * 60 * 1000);

    return {
      success: true,
      message: 'OTP verified successfully. Customer profile editing unlocked!',
    };
  }

  async updateCustomerDetails(customerId: number, input: UpdateCustomerDetailsInput) {
    const { email, firstName, lastName, phoneNumber, address, dateOfBirth } = input;

    const customerList = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (customerList.length === 0) {
      throw new AppError(404, 'Customer record not found');
    }

    const currentCustomer = customerList[0];
    const otpRecord = this.editOtpStore.get(customerId);
    const now = Date.now();

    if (!otpRecord || !otpRecord.isUnlocked || !otpRecord.unlockedExpiresAt || now > otpRecord.unlockedExpiresAt.getTime()) {
      if (otpRecord) this.editOtpStore.delete(customerId);
      throw new AppError(403, 'EDIT_NOT_AUTHORIZED. Please verify the OTP sent to the registered email first.');
    }

    // Checks for email conflicts if email address is updated.
    let newEmailToSet: string | undefined = undefined;
    if (email && email.trim().toLowerCase() !== currentCustomer.email.toLowerCase()) {
      const normalizedNewEmail = email.trim().toLowerCase();

      const emailConflict = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.email, normalizedNewEmail), sql`${customers.id} != ${customerId}`))
        .limit(1);

      if (emailConflict.length > 0) {
        throw new AppError(409, 'An account with this email address already exists.');
      }

      newEmailToSet = normalizedNewEmail;
    }

    // Consumes edit session lock.
    this.editOtpStore.delete(customerId);

    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (newEmailToSet) updateFields.email = newEmailToSet;
    if (firstName !== undefined) updateFields.firstName = firstName.trim();
    if (lastName !== undefined) updateFields.lastName = lastName.trim();
    if (phoneNumber !== undefined) updateFields.phoneNumber = phoneNumber.trim();
    if (address !== undefined) updateFields.address = address.trim();
    if (dateOfBirth !== undefined && dateOfBirth) {
      updateFields.dateOfBirth = new Date(dateOfBirth);
    }

    await db
      .update(customers)
      .set(updateFields)
      .where(eq(customers.id, customerId));

    const [updatedCustomer] = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phoneNumber: customers.phoneNumber,
        dateOfBirth: customers.dateOfBirth,
        nationalId: customers.nationalId,
        address: customers.address,
        kycStatus: customers.kycStatus,
        isActive: customers.isActive,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    return updatedCustomer;
  }

  async updateAccountStatus(input: updateAccountInput) {
    const { userId, kycStatus, isActive } = input;

    // Fetch user and linked account
    const records = await db
      .select({
        user: customers,
        account: accounts,
        branch: branches,
      })
      .from(customers)
      .leftJoin(accounts, eq(customers.id, accounts.customerId))
      .leftJoin(branches, eq(accounts.branchId, branches.branchCode))
      .where(eq(customers.id, userId))
      .limit(1);

    if (!records.length || !records[0].user) {
      throw new AppError(404, 'User account not found');
    }

    const { user, account, branch } = records[0];
    const wasInactive = !user.isActive;

    // Update user status
    await db
      .update(customers)
      .set({
        kycStatus,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, userId));

    // send account details if verified.
    if (wasInactive && isActive && kycStatus === 'verified' && account) {
      try {
        await emailService.sendAccountDetails({
          to: user.email,
          firstName: user.firstName,
          customerId: account.customerId,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          branchCode: branch?.branchCode || 'ARTH001',
        });
      } catch (emailErr) {
        console.error('Email send skipped or failed during activation:', emailErr);
      }
    }

    return { message: 'Account status updated successfully' };
  }

  async getCustomerProfileAndAccount(customerId: number) {
    const customerRecords = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (customerRecords.length === 0) {
      throw new AppError(404, 'Customer profile not found');
    }

    const customerRecord = customerRecords[0];

    // Fetch linked bank account details
    const accountRecords = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.accountNumber,
        accountType: accounts.accountType,
        balance: accounts.balance,
        availableBalance: accounts.availableBalance,
        currency: accounts.currency,
        status: accounts.status,
        branchCode: accounts.branchId,
        branchName: branches.branchName,
        ifscCode: branches.ifscCode,
      })
      .from(accounts)
      .leftJoin(branches, eq(accounts.branchId, branches.branchCode))
      .where(eq(accounts.customerId, customerId))
      .limit(1);

    const account = accountRecords.length > 0 ? {
      ...accountRecords[0],
      balance: Number(accountRecords[0].balance),
      availableBalance: Number(accountRecords[0].availableBalance),
      ifscCode: accountRecords[0].ifscCode || 'ARTH0000001',
    } : null;

    // Fetch linked loan accounts
    const rawLoans = await db
      .select()
      .from(loans)
      .where(eq(loans.customerId, customerId));

    // Cast Postgres numeric strings to JavaScript Numbers for the frontend
    const customerLoans = rawLoans.map(loan => ({
      ...loan,
      principalAmount: Number(loan.principalAmount),
      outstandingBalance: Number(loan.outstandingBalance),
      interestRate: Number(loan.interestRate),
      emiAmount: Number(loan.emiAmount)
    }));

    // Fetch recent transactions
    let txList: any[] = [];
    if (account) {
      const dbTransactions = await db
        .select()
        .from(transactions)
        .where(
          or(
            eq(transactions.senderAccountId, account.id),
            eq(transactions.receiverAccountId, account.id)
          )
        )
        .orderBy(desc(transactions.createdAt))
        .limit(10);

      txList = dbTransactions.map(tx => ({
        id: tx.id,
        description: tx.description || `${tx.type} Transaction`,
        date: new Date(tx.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        type: tx.senderAccountId === account.id ? 'DEBIT' : 'CREDIT',
        amount: Number(tx.amount),
        status: tx.status,
      }));
    }

    return {
      customer: {
        customerId: customerRecord.id,
        email: customerRecord.email,
        firstName: customerRecord.firstName,
        lastName: customerRecord.lastName,
        phoneNumber: customerRecord.phoneNumber,
        kycStatus: customerRecord.kycStatus,
        isActive: customerRecord.isActive,
      },
      account,
      transactions: txList,
      loans: customerLoans, // FIX: Now successfully passed to the client
    };
  }

  async getAccountBeneficiaries(accountId: number) {
    const [account] = await db
      .select({ customerId: accounts.customerId })
      .from(accounts)
      .where(eq(accounts.customerId, accountId))
      .limit(1);

    if (!account) throw new AppError(404, 'Account not found');

    return await db
      .select()
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.customerId, account.customerId),
          eq(beneficiaries.isVerified, true)
        )
      );
  }
  async transferToBeneficiary(accountId: number, beneficiaryId: string, amount: number, description: string) {
    if (amount <= 0) throw new AppError(400, 'Transfer amount must be greater than zero');

    return await db.transaction(async (tx) => {
      // Locks sender account to prevent concurrent withdrawal race conditions.
      const [account] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.customerId, accountId))
        .for('update');

      if (!account) throw new AppError(404, 'Source account not found');
      if (account.status !== 'ACTIVE') throw new AppError(403, 'Account is not active');

      // Validates sufficient funds for transfer.
      const currentBalance = parseFloat(account.balance);
      if (currentBalance < amount) {
        throw new AppError(400, `Insufficient funds. Available: ₹${currentBalance.toFixed(2)}`);
      }

      // Verifies beneficiary existence and ownership.
      const [beneficiary] = await tx
        .select()
        .from(beneficiaries)
        .where(eq(beneficiaries.id, beneficiaryId))
        .limit(1);

      if (!beneficiary) throw new AppError(404, 'Beneficiary not found');
      if (beneficiary.customerId !== account.customerId) {
        throw new AppError(403, 'Beneficiary does not belong to this account holder');
      }
      if (!beneficiary.isVerified) {
        throw new AppError(403, 'Cannot transfer to an unverified beneficiary');
      }

      // Deducts balance from sender account.
      const newBalance = (currentBalance - amount).toFixed(2);
      await tx
        .update(accounts)
        .set({
          balance: newBalance,
          availableBalance: newBalance,
          updatedAt: new Date()
        })
        .where(eq(accounts.customerId, accountId));

      // if transfer is made to anyone inside the same bank, credited their account
      const [receiverAccount] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.accountNumber, beneficiary.accountNumber))
        .for('update');

      let receiverAccountId: number | null = null;

      if (receiverAccount) {
        if (receiverAccount.id === account.id) {
          throw new AppError(400, 'Cannot transfer money to the same account');
        }

        receiverAccountId = receiverAccount.id;
        const receiverCurrentBalance = parseFloat(receiverAccount.balance);
        const receiverNewBalance = (receiverCurrentBalance + amount).toFixed(2);

        await tx
          .update(accounts)
          .set({
            balance: receiverNewBalance,
            availableBalance: receiverNewBalance,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, receiverAccount.id));
      }

      // Transaction Ledger Record
      const referenceNumber = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const [txn] = await tx
        .insert(transactions)
        .values({
          referenceNumber,
          idempotencyKey: randomUUID(), // Prevents duplicate network retries
          senderAccountId: account.id,
          receiverAccountId: receiverAccountId, // Link receiver account ID if internal
          externalAccountNumber: beneficiary.accountNumber,
          externalRoutingCode: beneficiary.ifscCode,
          externalBankName: beneficiary.bankName,
          amount: amount.toFixed(2),
          currency: 'INR',
          type: 'TRANSFER',
          status: 'COMPLETED',
          description: description || `Transfer to ${beneficiary.name}`,
          completedAt: new Date(),
        })
        .returning();

      return { transaction: txn, newBalance };
    });
  }

  async addBeneficiary(accountId: number, dto: { name: string; accountNumber: string; ifscCode: string; bankName: string }) {
    const [account] = await db
      .select({ customerId: accounts.customerId })
      .from(accounts)
      .where(eq(accounts.customerId, accountId))
      .limit(1);

    if (!account) throw new AppError(404, 'Account not found');

    const [newBeneficiary] = await db
      .insert(beneficiaries)
      .values({
        customerId: account.customerId,
        name: dto.name,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,
        bankName: dto.bankName,
        isVerified: true,
      })
      .returning();

    return newBeneficiary;
  }

  async getAllTransactions(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
  } = {}) {
    const requestedPage = params.page;
    const requestedLimit = params.limit;
    const page = Number.isInteger(requestedPage) && requestedPage! > 0 ? requestedPage! : 1;
    const limit = Number.isInteger(requestedLimit) && requestedLimit! > 0
      ? Math.min(requestedLimit!, 100)
      : 10;
    const offset = (page - 1) * limit;
    const senderAcc = alias(accounts, 'sender_acc');
    const receiverAcc = alias(accounts, 'receiver_acc');
    const senderCust = alias(customers, 'sender_cust');
    const receiverCust = alias(customers, 'receiver_cust');

    const filters = [];
    const search = params.search?.trim();

    if (search) {
      const pattern = `%${search}%`;
      filters.push(or(
        ilike(transactions.referenceNumber, pattern),
        ilike(transactions.description, pattern),
        ilike(transactions.externalBankName, pattern),
        ilike(senderAcc.accountNumber, pattern),
        ilike(receiverAcc.accountNumber, pattern),
        ilike(senderCust.firstName, pattern),
        ilike(senderCust.lastName, pattern),
        ilike(receiverCust.firstName, pattern),
        ilike(receiverCust.lastName, pattern),
        sql`CAST(${transactions.amount} AS TEXT) ILIKE ${pattern}`,
      ));
    }

    if (params.status && params.status !== 'ALL') {
      filters.push(eq(transactions.status, params.status as typeof transactions.status.enumValues[number]));
    }

    if (params.type && params.type !== 'ALL') {
      filters.push(eq(transactions.type, params.type as typeof transactions.type.enumValues[number]));
    }

    if (params.fromDate) {
      filters.push(gte(transactions.createdAt, new Date(`${params.fromDate}T00:00:00.000Z`)));
    }

    if (params.toDate) {
      filters.push(lte(transactions.createdAt, new Date(`${params.toDate}T23:59:59.999Z`)));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const [totalResult, rawTransactions] = await Promise.all([
      db
        .select({ total: count() })
        .from(transactions)
        .leftJoin(senderAcc, eq(transactions.senderAccountId, senderAcc.id))
        .leftJoin(senderCust, eq(senderAcc.customerId, senderCust.id))
        .leftJoin(receiverAcc, eq(transactions.receiverAccountId, receiverAcc.id))
        .leftJoin(receiverCust, eq(receiverAcc.customerId, receiverCust.id))
        .where(whereClause),
      db
        .select({
          id: transactions.id,
          referenceNumber: transactions.referenceNumber,
          idempotencyKey: transactions.idempotencyKey,
          senderAccountId: transactions.senderAccountId,
          senderAccountNumber: senderAcc.accountNumber,
          senderFirstName: senderCust.firstName,
          senderLastName: senderCust.lastName,
          receiverAccountId: transactions.receiverAccountId,
          receiverAccountNumber: receiverAcc.accountNumber,
          receiverFirstName: receiverCust.firstName,
          receiverLastName: receiverCust.lastName,
          externalAccountNumber: transactions.externalAccountNumber,
          externalRoutingCode: transactions.externalRoutingCode,
          externalBankName: transactions.externalBankName,
          amount: transactions.amount,
          feeAmount: transactions.feeAmount,
          currency: transactions.currency,
          type: transactions.type,
          status: transactions.status,
          failureReason: transactions.failureReason,
          description: transactions.description,
          createdAt: transactions.createdAt,
          completedAt: transactions.completedAt,
        })
        .from(transactions)
        .leftJoin(senderAcc, eq(transactions.senderAccountId, senderAcc.id))
        .leftJoin(senderCust, eq(senderAcc.customerId, senderCust.id))
        .leftJoin(receiverAcc, eq(transactions.receiverAccountId, receiverAcc.id))
        .leftJoin(receiverCust, eq(receiverAcc.customerId, receiverCust.id))
        .where(whereClause)
        .orderBy(desc(transactions.createdAt), desc(transactions.id))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      transactions: rawTransactions.map((tx) => ({
        id: tx.id,
        referenceNumber: tx.referenceNumber,
        idempotencyKey: tx.idempotencyKey,
        senderAccountId: tx.senderAccountId,
        senderAccountNumber: tx.senderAccountNumber || 'N/A',
        senderName: tx.senderFirstName ? `${tx.senderFirstName} ${tx.senderLastName || ''}`.trim() : 'N/A',
        receiverAccountId: tx.receiverAccountId,
        receiverAccountNumber: tx.receiverAccountNumber || tx.externalAccountNumber || 'N/A',
        receiverName: tx.receiverFirstName
          ? `${tx.receiverFirstName} ${tx.receiverLastName || ''}`.trim()
          : (tx.externalBankName ? `External (${tx.externalBankName})` : (tx.externalAccountNumber ? `Ext Acc: ${tx.externalAccountNumber}` : 'N/A')),
        externalAccountNumber: tx.externalAccountNumber,
        externalRoutingCode: tx.externalRoutingCode,
        externalBankName: tx.externalBankName,
        amount: Number(tx.amount),
        feeAmount: Number(tx.feeAmount || 0),
        currency: tx.currency,
        type: tx.type,
        status: tx.status,
        failureReason: tx.failureReason,
        description: tx.description,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      })),
      pagination: {
        page,
        limit,
        total: Number(totalResult[0]?.total ?? 0),
        totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
      },
    };
  }


  // deposit

  createDeposit = async ({
    accountId,
    amount,
    description,
  }: {
    accountId: number;
    amount: number;
    description?: string;
  }) => {
    const result = await db.transaction(async (tx) => {
      const accountResult = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.customerId, accountId))
        .limit(1);

      const account = accountResult[0];
      const customerResult = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, accountId))
        .limit(1);

      const customer = customerResult[0];

      if (!account) {
        throw new Error('Account not found');
      }

      if (account.status !== 'ACTIVE') {
        throw new Error('Account is not active');
      }

      const referenceNumber = `DEP-${crypto.randomUUID()}`;

      const transactionResult = await tx
        .insert(transactions)
        .values({
          referenceNumber,
          senderAccountId: null,
          receiverAccountId: account.id,
          amount: amount.toFixed(2),
          feeAmount: '0.00',
          currency: account.currency,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          description: description?.trim() || 'Account deposit',
          completedAt: new Date(),
        })
        .returning();

      const transaction = transactionResult[0];

      const updatedAccountResult = await tx
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} + ${amount.toFixed(2)}`,
          availableBalance: sql`${accounts.availableBalance} + ${amount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, account.id))
        .returning();

      return {
        transaction,
        account: updatedAccountResult[0],
        customer
      };
    });
    await emailService.sendTransactionEmail({
      to: result.customer.email,
      firstName: result.customer.firstName,
      transactionId: result.transaction.id,
      referenceNumber: result.transaction.referenceNumber,
      type: 'DEPOSIT',
      amount: result.transaction.amount,
      currency: result.transaction.currency,
      accountNumber: result.account.accountNumber,
      description: result.transaction.description,
      balance: result.account.availableBalance,
      createdAt: result.transaction.createdAt,
    })
    return result;
  }



  //withdraw

  createWithdraw = async ({
    accountId,
    amount,
    description,
  }: {
    accountId: number;
    amount: number;
    description?: string;
  }) => {
    const result = await db.transaction(async (tx) => {
      const accountResult = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.customerId, accountId))
        .limit(1);

      const account = accountResult[0];

      const customerResult = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, account.customerId))
        .limit(1);

      const customer = customerResult[0];

      if (!customer) {
        throw new Error('Customer not found');
      }
      if (!account) {
        throw new Error('Account not found');
      }

      if (account.status !== 'ACTIVE') {
        throw new Error('Account is not active');
      }

      const availableBalance = Number(account.availableBalance);

      if (availableBalance < amount) {
        throw new Error('Insufficient available balance');
      }

      const referenceNumber = `WDL-${crypto.randomUUID()}`;

      const transactionResult = await tx
        .insert(transactions)
        .values({
          referenceNumber,
          senderAccountId: account.id,
          receiverAccountId: null,
          externalAccountNumber: null,
          externalRoutingCode: null,
          externalBankName: null,
          amount: amount.toFixed(2),
          feeAmount: '0.00',
          currency: account.currency,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          description: description?.trim() || 'Account withdrawal',
          completedAt: new Date(),
        })
        .returning();

      const transaction = transactionResult[0];

      const updatedAccountResult = await tx
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} - ${amount.toFixed(2)}`,
          availableBalance: sql`${accounts.availableBalance} - ${amount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accounts.id, account.id),
            sql`${accounts.availableBalance} >= ${amount.toFixed(2)}`
          )
        )
        .returning();

      if (updatedAccountResult.length === 0) {
        throw new Error('Insufficient available balance');
      }

      return {
        transaction,
        account: updatedAccountResult[0],
        customer
      };
    });
    await emailService.sendTransactionEmail({
      to: result.customer.email,
      firstName: result.customer.firstName,
      transactionId: result.transaction.id,
      referenceNumber: result.transaction.referenceNumber,
      type: 'DEPOSIT',
      amount: result.transaction.amount,
      currency: result.transaction.currency,
      accountNumber: result.account.accountNumber,
      description: result.transaction.description,
      balance: result.account.availableBalance,
      createdAt: result.transaction.createdAt,
    });
    return result;
  }

  generateStatement = async ({
    customerId,
    from,
    to,
    format,
  }: GenerateStatementParams): Promise<Buffer> => {
    if (format !== 'pdf') {
      throw new Error('Unsupported statement format');
    }

    const statement = await this.getStatementData({
      customerId,
      from,
      to,
    });

    const {
      account,
      openingBalance,
      closingBalance,
      transactions: statementTransactions,
    } = statement;

    // Generate PDF
    return generateStatementPdf(statement);
  };

  getStatementData = async ({
    customerId,
    from,
    to,
  }: GetStatementDataParams): Promise<StatementData> => {
    // Validate dates

    const fromDate = new Date(`${from}T00:00:00+05:30`);
    const toDate = new Date(`${to}T23:59:59.999+05:30`);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      throw new Error('Invalid statement dates');
    }

    if (fromDate > toDate) {
      throw new Error('From date cannot be after To date');
    }

    // Fetch account and customer

    const accountResult = await db
      .select({
        id: accounts.id,
        accountId: accounts.accountId,
        accountNumber: accounts.accountNumber,
        accountType: accounts.accountType,
        currency: accounts.currency,
        balance: accounts.balance,
        availableBalance: accounts.availableBalance,
        status: accounts.status,

        customerId: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
      })
      .from(accounts)
      .innerJoin(
        customers,
        eq(accounts.customerId, customers.id),
      )
      .where(eq(accounts.customerId, Number(customerId)))
      .limit(1);

    if (accountResult.length === 0) {
      throw new Error('Account not found');
    }

    const account = accountResult[0];

    // Helper SQL expression for timestamp fallback
    const txnTimestamp = sql`COALESCE(${transactions.completedAt}, ${transactions.createdAt})`;

    // Fetch all completed transactions from `fromDate` onwards to calculate opening balance relative to current ledger balance
    const transactionsFromFromDate = await db
      .select({
        senderAccountId: transactions.senderAccountId,
        receiverAccountId: transactions.receiverAccountId,
        amount: transactions.amount,
        feeAmount: transactions.feeAmount,
        type: transactions.type,
        txnTime: txnTimestamp,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, 'COMPLETED'),
          gte(txnTimestamp, fromDate),
          or(
            eq(transactions.senderAccountId, account.id),
            eq(transactions.receiverAccountId, account.id),
          ),
        ),
      );

    const currentBalance = Number(account.balance);
    let netChangeFromFromDate = 0;

    for (const transaction of transactionsFromFromDate) {
      const amount = Number(transaction.amount);
      const fee = Number(transaction.feeAmount);

      if (transaction.receiverAccountId === account.id) {
        netChangeFromFromDate += amount;
      }

      if (transaction.senderAccountId === account.id) {
        netChangeFromFromDate -= (amount + fee);
      }
    }

    const openingBalance = currentBalance - netChangeFromFromDate;

    // Fetch transactions in requested period
    const statementRows = await db
      .select({
        id: transactions.id,
        referenceNumber: transactions.referenceNumber,
        senderAccountId: transactions.senderAccountId,
        receiverAccountId: transactions.receiverAccountId,
        amount: transactions.amount,
        feeAmount: transactions.feeAmount,
        type: transactions.type,
        description: transactions.description,
        createdAt: transactions.createdAt,
        completedAt: transactions.completedAt,
        txnTime: txnTimestamp,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, 'COMPLETED'),
          gte(txnTimestamp, fromDate),
          lte(txnTimestamp, toDate),
          or(
            eq(transactions.senderAccountId, account.id),
            eq(transactions.receiverAccountId, account.id),
          ),
        ),
      )
      .orderBy(asc(txnTimestamp));

    // Calculate running balance
    let runningBalance = openingBalance;

    const statementTransactions: StatementTransaction[] =
      statementRows.map((transaction) => {
        const amount = Number(transaction.amount);
        const fee = Number(transaction.feeAmount);

        let debit = 0;
        let credit = 0;

        if (transaction.receiverAccountId === account.id) {
          credit = amount;
          runningBalance += amount;
        }

        if (transaction.senderAccountId === account.id) {
          debit = amount + fee;
          runningBalance -= (amount + fee);
        }

        return {
          id: transaction.id,
          referenceNumber: transaction.referenceNumber,
          createdAt: transaction.createdAt,
          description:
            transaction.description ||
            transaction.type.replace('_', ' '),
          type: transaction.type,
          amount,
          debit,
          credit,
          balance: runningBalance,
        };
      });

    return {
      account: {
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currency: account.currency,
        firstName: account.firstName,
        lastName: account.lastName,
      },
      from,
      to,
      openingBalance,
      closingBalance: runningBalance,
      transactions: statementTransactions,
    };
  }
  // loan section
  async createLoanAccount(payload: {
    customerId: number;
    type: 'PERSONAL' | 'HOME' | 'AUTO' | 'EDUCATION';
    principalAmount: number;
    interestRate: number;
    tenureMonths: number;
  }) {
    const { customerId, type, principalAmount, interestRate, tenureMonths } = payload;

    // Validates inputs to prevent division by zero or negative loan amounts.
    if (principalAmount <= 0 || interestRate <= 0 || tenureMonths <= 0) {
      throw new AppError(400, 'Principal, interest rate, and tenure must be strictly positive values.');
    }

    // Verifies customer existence.
    const [customerExists] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customerExists) {
      throw new AppError(404, 'Customer not found');
    }
    // Formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    const r = interestRate / 12 / 100; // Monthly interest rate
    const calculatedEmi = (principalAmount * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);

    // Calculates first EMI date (1 month from today).
    const nextEmiDate = new Date();
    nextEmiDate.setMonth(nextEmiDate.getMonth() + 1);

    // 5. Generate a unique, readable Loan Number
    const loanNumber = `LN${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

    // 6. Insert into Database
    const [newLoan] = await db
      .insert(loans)
      .values({
        loanNumber,
        customerId,
        type,
        status: 'ACTIVE',
        principalAmount: principalAmount.toFixed(2),
        outstandingBalance: principalAmount.toFixed(2), // Initially, outstanding == principal
        interestRate: interestRate.toFixed(2),
        tenureMonths,
        emiAmount: calculatedEmi.toFixed(2),
        nextEmiDate,
        disbursedAt: new Date(),
      })
      .returning();

    return newLoan;
  }
  async processLoanRepayment(accountId: number, loanId: string, paymentType: 'EMI' | 'FULL') {
    return await db.transaction(async (tx) => {
      // Locks sender account and loan account.
      const [account] = await tx.select().from(accounts).where(eq(accounts.customerId, accountId)).for('update');
      const [loan] = await tx.select().from(loans).where(eq(loans.id, loanId)).for('update');

      if (!account) throw new AppError(404, 'Source account not found');
      if (!loan) throw new AppError(404, 'Loan account not found');
      if (loan.status !== 'ACTIVE') throw new AppError(400, `Cannot process payment. Loan is ${loan.status}`);

      // Determines exact payment amount.
      const amountToPay = paymentType === 'EMI'
        ? Number(loan.emiAmount)
        : Number(loan.outstandingBalance);

      if (amountToPay <= 0) throw new AppError(400, 'No outstanding balance to pay');

      // Verifies sufficient funds in primary account.
      const currentBalance = Number(account.balance);
      if (currentBalance < amountToPay) {
        throw new AppError(400, `Insufficient funds. Need ₹${amountToPay.toFixed(2)}, but available balance is ₹${currentBalance.toFixed(2)}`);
      }

      // Calculates updated balances.
      const newAccountBalance = (currentBalance - amountToPay).toFixed(2);
      const newLoanBalance = (Number(loan.outstandingBalance) - amountToPay).toFixed(2);
      const newLoanStatus = Number(newLoanBalance) <= 0.01 ? 'CLOSED' : 'ACTIVE'; // 0.01 to handle float rounding

      // Advances next EMI date for standard EMI payment.
      const nextEmiDate = new Date(loan.nextEmiDate || new Date());
      if (paymentType === 'EMI') {
        nextEmiDate.setMonth(nextEmiDate.getMonth() + 1);
      }

      // Executes database updates.
      await tx.update(accounts)
        .set({ balance: newAccountBalance, availableBalance: newAccountBalance, updatedAt: new Date() })
        .where(eq(accounts.id, accountId));

      await tx.update(loans)
        .set({
          outstandingBalance: newLoanBalance,
          status: newLoanStatus,
          nextEmiDate: paymentType === 'EMI' ? nextEmiDate : loan.nextEmiDate
        })
        .where(eq(loans.id, loanId));

      // 7. Record the ledger transaction
      const referenceNumber = `LOAN-PAY-${Date.now()}`;
      await tx.insert(transactions).values({
        referenceNumber,
        idempotencyKey: randomUUID(),
        senderAccountId: accountId,
        amount: amountToPay.toFixed(2),
        currency: 'INR',
        type: 'TRANSFER',
        status: 'COMPLETED',
        description: paymentType === 'EMI' ? `EMI Payment for Loan ${loan.loanNumber}` : `Full Settlement for Loan ${loan.loanNumber}`,
      });

      return { amountPaid: amountToPay, newLoanBalance, status: newLoanStatus };
    });
  }
}
export const adminService = new AdminService();