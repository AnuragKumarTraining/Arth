import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, or, desc } from 'drizzle-orm';
import { db } from '../db';
import { customers, accounts, branches, transactions } from '../db/schema';
import { AppError } from '../error/AppError';
import { env } from '../config/env';
import { CustomerSessionPayload } from '../types/customerSession';

export class CustomerAuthService {
  async authenticateCustomer(
    loginIdentifier: string,
    plainPassword: string
  ): Promise<{ token: string; customer: CustomerSessionPayload}> {
    if (!loginIdentifier || !plainPassword) {
      throw new AppError(400, 'Email / Customer ID and password are required');
    }

    const query = loginIdentifier.toString().trim().toLowerCase();
    const isNumericId = /^\d+$/.test(query);

    const records = await db
      .select()
      .from(customers)
      .where(
        isNumericId
          ? eq(customers.id, Number(query))
          : eq(customers.email, query)
      )
      .limit(1);

    if (records.length === 0) {
      throw new AppError(401, 'Invalid email/Customer ID or password');
    }

    const customerRecord = records[0];

    const isMatch = await bcrypt.compare(plainPassword, customerRecord.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Optional Check: Restrict access if the customer account is deactivated
    if (!customerRecord.isActive) {
      throw new AppError(403, 'Account is inactive. Please contact customer support.');
    }

    const customerPayload: CustomerSessionPayload = {
      customerId: customerRecord.id,
      email: customerRecord.email,
      firstName: customerRecord.firstName,
      lastName: customerRecord.lastName,
      role: 'customer',
      kycStatus: customerRecord.kycStatus,
      isActive: customerRecord.isActive,
    };

    const token = jwt.sign(customerPayload, env.accessToken, {
      expiresIn: env.key_expiry,
    });

    return { token, customer: customerPayload };
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

    // Fetch linked bank account & branch metadata
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

  verifyToken(token: string): CustomerSessionPayload {
    try {
      const decoded = jwt.verify(token, env.accessToken) as CustomerSessionPayload;
      if (decoded.role !== 'customer') {
        throw new AppError(403, 'Forbidden: Insufficient privileges');
      }
      return decoded;
    } catch (err) {
      throw new AppError(401, 'Invalid or expired session');
    }
  }
}

export const customerAuthService = new CustomerAuthService();