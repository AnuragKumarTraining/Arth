
import { db } from '../db';
import { customers, accounts, branches, transactions, beneficiaries } from '../db/schema';
import { AppError } from '../error/AppError';
import { emailService } from './email.services';
import { updateAccountInput} from '../validator/admin.validator';;
import { eq, or, desc, and} from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
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
      // 1. Lock the sender's account to prevent concurrent withdrawal race conditions
      const [account] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.customerId, accountId))
        .for('update');

      if (!account) throw new AppError(404, 'Source account not found');
      if (account.status !== 'ACTIVE') throw new AppError(403, 'Account is not active');

      // 2. Validate sufficient funds
      const currentBalance = parseFloat(account.balance);
      if (currentBalance < amount) {
        throw new AppError(400, `Insufficient funds. Available: ₹${currentBalance.toFixed(2)}`);
      }

      // 3. Verify the beneficiary exists and belongs to this customer
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

      // 4. Deduct the balances
      const newBalance = (currentBalance - amount).toFixed(2);
      await tx
        .update(accounts)
        .set({ 
          balance: newBalance, 
          availableBalance: newBalance, 
          updatedAt: new Date() 
        })
        .where(eq(accounts.id, accountId));

      // 5. Create the Transaction Ledger Record
      const referenceNumber = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const [txn] = await tx
        .insert(transactions)
        .values({
          referenceNumber,
          idempotencyKey: randomUUID(), // Prevents duplicate network retries
          senderAccountId: accountId,
          externalAccountNumber: beneficiary.accountNumber,
          externalRoutingCode: beneficiary.ifscCode,
          externalBankName: beneficiary.bankName,
          amount: amount.toFixed(2),
          currency: 'INR',
          type: 'TRANSFER',
          status: 'COMPLETED',
          description: description || `Transfer to ${beneficiary.name}`,
        })
        .returning();

      return { transaction: txn, newBalance };
    });
  }
  // Add this method inside BankingService class
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
}

export const adminService = new AdminService();