import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { admins } from '../db/schema/admin';
import { AppError } from '../error/AppError';
import { env } from '../config/env';
import { AdminSessionPayload } from '../types/adminSessionPayload';

export class AdminAuthService {
  async authenticateAdmin(
    email: string,
    plainPassword: string
  ): Promise<{ token: string; admin: AdminSessionPayload }> {
    if (!email || !plainPassword) {
      throw new AppError(400, 'Email and password are required');
    }

    const records = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email.toLowerCase().trim()))
      .limit(1);

    if (records.length === 0) {
      throw new AppError(401, 'Invalid administrative credentials');
    }

    const adminRecord = records[0];
    const isMatch = await bcrypt.compare(plainPassword, adminRecord.password);

    if (!isMatch) {
      throw new AppError(401, 'Invalid administrative credentials');
    }

    const adminPayload: AdminSessionPayload = {
      adminId: adminRecord.id,
      email: adminRecord.email,
      role: 'admin',
    };

    const token = jwt.sign(adminPayload, env.adminJwtSecret, {
      expiresIn: env.key_expiry,
    });

    return { token, admin: adminPayload };
  }

  verifyToken(token: string): AdminSessionPayload {
    try {
      const decoded = jwt.verify(token, env.adminJwtSecret) as AdminSessionPayload;
      if (decoded.role !== 'admin') {
        throw new AppError(403, 'Forbidden: Insufficient privileges');
      }
      return decoded;
    } catch (err) {
      throw new AppError(401, 'Invalid or expired administrative session');
    }
  }
}

export const adminAuthService = new AdminAuthService();