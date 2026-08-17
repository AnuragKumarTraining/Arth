import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { admins } from '../db/schema/admin';
import { AppError } from '../error/AppError';
import { AdminSessionPayload } from '../types/adminSessionPayload';

// Hardcoded secret and expiry for development
const JWT_ADMIN_SECRET = 'admin_token';
const TOKEN_EXPIRY = '8h';

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

    const token = jwt.sign(adminPayload, JWT_ADMIN_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    return { token, admin: adminPayload };
  }

  verifyToken(token: string): AdminSessionPayload {
    try {
      const decoded = jwt.verify(token, JWT_ADMIN_SECRET) as AdminSessionPayload;
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