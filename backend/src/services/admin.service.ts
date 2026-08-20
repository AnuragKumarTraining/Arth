import type { Request, Response } from 'express';
import { db } from '../db';
import { customers, accounts, branches, transactions, beneficiaries } from '../db/schema';
import { AppError } from '../error/AppError';
import { emailService } from './email.services';
import { updateAccountInput} from '../validator/admin.validator';;
import { eq, or, desc, and,sql, lt, gte, lte, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { GenerateStatementParams, GetStatementDataParams, StatementData, StatementTransaction } from '../types/statements.types';
import { generateStatementPdf } from './statement.pdf.service';
export class AdminService {
  async listUsers() {
    return await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phoneNumber: customers.phoneNumber,
        kycStatus: customers.kycStatus,
        isActive: customers.isActive,
        createdAt: customers.createdAt,
        customerId: accounts.customerId,
        accountNumber: accounts.accountNumber,
        accountType: accounts.accountType,
      })
      .from(customers)
      .leftJoin(accounts, eq(customers.id, accounts.customerId));
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
      await emailService.sendAccountDetails({
        to: user.email,
        firstName: user.firstName,
        customerId: account.customerId,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        branchCode: branch?.branchCode || 'ARTH001',
      });
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

    // Fetch linked bank account and setails
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
      //Locked the sender's account to prevent concurrent withdrawal race conditions
      const [account] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.customerId, accountId))
        .for('update');

      if (!account) throw new AppError(404, 'Source account not found');
      if (account.status !== 'ACTIVE') throw new AppError(403, 'Account is not active');

      //Validate sufficient funds
      const currentBalance = parseFloat(account.balance);
      if (currentBalance < amount) {
        throw new AppError(400, `Insufficient funds. Available: ₹${currentBalance.toFixed(2)}`);
      }

      //Verify the beneficiary exists and belongs to this customer
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

      //Deducting the balances from sender's account
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

  async getAllTransactions() {
    const senderAcc = alias(accounts, 'sender_acc');
    const receiverAcc = alias(accounts, 'receiver_acc');
    const senderCust = alias(customers, 'sender_cust');
    const receiverCust = alias(customers, 'receiver_cust');

    const rawTransactions = await db
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
      .orderBy(desc(transactions.createdAt));

    return rawTransactions.map((tx) => ({
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
    }));
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
  const result =  await db.transaction(async (tx) => {
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
};
}
export const adminService = new AdminService();