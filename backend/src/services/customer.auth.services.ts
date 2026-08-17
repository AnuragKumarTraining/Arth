import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { customers } from '../db/schema';
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