// src/service/admin.service.ts
import { db } from '../db';
import { customers, accounts, branches } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../error/AppError';
import { emailService } from './email.services';
import { updateAccountInput} from '../validator/admin.validator';

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
}

export const adminService = new AdminService();