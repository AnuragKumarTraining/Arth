import crypto from 'crypto';
import { eq, or } from 'drizzle-orm';
import { db } from '../db';
import { customers, accounts, branches, pendingRegistrations } from '../db/schema';
import { AppError } from '../error/AppError';
import { emailService } from './email.services';
import bcrypt from "bcrypt";
import { CreateAccountInput, ResendOtpInput, VerifyAccountInput } from '../validator/auth.validator';

export class AuthService {
  async initiateSignup(input: CreateAccountInput): Promise<void> {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      nationalId,
      address,
      accountType,
    } = input;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNationalId = nationalId.trim().toUpperCase();
    console.info(`[AuthService:initiateSignup] Starting signup initiation for: ${normalizedEmail}`);

    // Checks for existing customer by email, national ID, or phone.
    const existingCustomer = await db
      .select({ id: customers.id, email: customers.email, nationalId: customers.nationalId })
      .from(customers)
      .where(
        or(
          eq(customers.email, normalizedEmail),
          eq(customers.nationalId, normalizedNationalId),
          eq(customers.phoneNumber, phoneNumber)
        )
      )
      .limit(1);

    if (existingCustomer.length > 0) {
      const existing = existingCustomer[0];
      if (existing.nationalId === normalizedNationalId) {
        throw new AppError(409, 'An account with this National ID exists');
      }
      if (existing.email === normalizedEmail) {
        console.warn(`[AuthService:initiateSignup] Account already exists for: ${normalizedEmail}. Suppressing disclosure.`);
        throw new AppError(409, 'An account with this email ID exists');
        return;
      }
      throw new AppError(409, 'An account with this phone number already exists.');
    }

    console.info(`[AuthService:initiateSignup] Hashing credentials and generating OTP for: ${normalizedEmail}`);
    const hashedPassword = await bcrypt.hash(password, 12);
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const now = new Date();
    const resendAvailableAt = new Date(now.getTime() + 59 * 1000);
    const expiresAt = new Date(now.getTime() + 3 * 60 * 1000);

    const registrationData = {
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      phoneNumber,
      nationalId: normalizedNationalId,
      address,
      accountType,
      hashedOtp,
      failedAttempts: 0,
      resendAvailableAt,
      expiresAt,
    };

    console.info(`[AuthService:initiateSignup] Upserting pending registration for: ${normalizedEmail}`);
    await db
      .insert(pendingRegistrations)
      .values(registrationData)
      .onConflictDoUpdate({
        target: pendingRegistrations.email,
        set: {
          ...registrationData,
          createdAt: new Date(),
        },
      });

    console.info(`[AuthService:initiateSignup] Dispatching OTP email to: ${normalizedEmail}`);
    await emailService.sendOtpEmail(normalizedEmail, rawOtp);
    console.info(`[AuthService:initiateSignup] Signup initiated successfully for: ${normalizedEmail}`);
  }

  async verifyAccount(input: VerifyAccountInput): Promise<void> {
    const { email, otp } = input;
    const normalizedEmail = email.trim().toLowerCase();

    console.info(`[AuthService:verifyAccount] Verifying OTP for: ${normalizedEmail}`);

    const pendingRecords = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, normalizedEmail))
      .limit(1);

    if (pendingRecords.length === 0) {
      console.warn(`[AuthService:verifyAccount] No pending registration found for: ${normalizedEmail}`);
      throw new AppError(403, 'INVALID_OR_EXPIRED_OTP');
    }

    const record = pendingRecords[0];

    // Checks OTP expiration.
    const nowMs = Date.now();
    const expiresAtMs = new Date(record.expiresAt).getTime();

    if (nowMs > expiresAtMs) {
      console.warn(`[AuthService:verifyAccount] OTP expired for: ${normalizedEmail}. Deleting pending record.`);
      await db.delete(pendingRegistrations).where(eq(pendingRegistrations.email, normalizedEmail));
      throw new AppError(400, 'INVALID_OR_EXPIRED_OTP');
    }

    if (record.failedAttempts >= 3) {
      console.warn(`[AuthService:verifyAccount] Maximum attempts exceeded for: ${normalizedEmail}. Deleting pending record.`);
      await db.delete(pendingRegistrations).where(eq(pendingRegistrations.email, normalizedEmail));
      throw new AppError(429, 'MAXIMUM_ATTEMPTS_REACHED');
    }

    const hashedInputOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const inputBuffer = Buffer.from(hashedInputOtp, 'hex');
    const storedBuffer = Buffer.from(record.hashedOtp, 'hex');
    const isOtpValid = inputBuffer.length === storedBuffer.length && crypto.timingSafeEqual(inputBuffer, storedBuffer);

    if (!isOtpValid) {
      const nextAttemptCount = record.failedAttempts + 1;
      console.warn(`[AuthService:verifyAccount] Invalid OTP provided for: ${normalizedEmail}. Incrementing failed attempts to ${nextAttemptCount}`);

      await db
        .update(pendingRegistrations)
        .set({ failedAttempts: nextAttemptCount })
        .where(eq(pendingRegistrations.email, normalizedEmail));

      throw new AppError(400, 'INVALID_OR_EXPIRED_OTP');
    }

    console.info(`[AuthService:verifyAccount] OTP valid. Executing customer & account creation transaction for: ${normalizedEmail}`);

    try {
      await db.transaction(async (tx) => {
        // Sets default branch to ARTH001 to avoid foreign key constraint conflicts.
        const existingBranch = await tx
          .select()
          .from(branches)
          .where(eq(branches.branchCode, 'ARTH001'))
          .limit(1);

        if (existingBranch.length === 0) {
          await tx.insert(branches).values({
            branchCode: 'ARTH001',
            branchName: 'ARTH Main Branch',
            ifscCode: 'ARTH0000001',
            address: 'Headquarters, Main Branch',
          });
        }

        const [insertedCustomer] = await tx.insert(customers).values({
          email: record.email,
          passwordHash: record.password,
          firstName: record.firstName,
          lastName: record.lastName,
          dateOfBirth: record.dateOfBirth,
          phoneNumber: record.phoneNumber,
          nationalId: record.nationalId,
          address: record.address,
          branchId: "ARTH001",
          isActive: false,
          kycStatus: 'PENDING_ADMIN_APPROVAL',
        }).returning({ id: customers.id });

        const accountNumber = '10' + Math.floor(1000000000 + Math.random() * 9000000000).toString();

        await tx.insert(accounts).values({
          accountNumber,
          accountType: record.accountType.toUpperCase(),
          balance: '0.00',
          availableBalance: '0.00',
          currency: 'INR',
          customerId: insertedCustomer.id,
          branchId: 'ARTH001',
          status: 'ACTIVE',
        });

        await tx.delete(pendingRegistrations).where(eq(pendingRegistrations.email, normalizedEmail));
      });
    } catch (err: any) {
      // Handles PostgreSQL unique constraint error (code 23505).
      if (err.code === '23505' || err.message?.includes('unique constraint')) {
        console.warn(`[AuthService:verifyAccount] Unique constraint violation during customer insert for: ${normalizedEmail}. Deleting pending record.`);
        await db.delete(pendingRegistrations).where(eq(pendingRegistrations.email, normalizedEmail));
        throw new AppError(409, 'An account with this National ID or Phone Number already exists. Please register with valid details.');
      }
      throw err;
    }

    console.info(`[AuthService:verifyAccount] Account verification completed for: ${normalizedEmail}`);
  }

  async resendOtp(input: ResendOtpInput): Promise<void> {
    const { email } = input;
    const normalizedEmail = email.trim().toLowerCase();
    console.info(`[AuthService:resendOtp] Resend request received for: ${normalizedEmail}`);

    const pendingRecords = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, normalizedEmail))
      .limit(1);

    if (pendingRecords.length === 0) {
      console.warn(`[AuthService:resendOtp] Resend requested for non-existent pending record: ${normalizedEmail}`);
      return;
    }

    const record = pendingRecords[0];
    const now = new Date();
    if (now < record.resendAvailableAt) {
      const retryAfterSeconds = Math.ceil(
        (record.resendAvailableAt.getTime() - now.getTime()) / 1000
      );
      console.warn(`[AuthService:resendOtp] Cooldown active for: ${normalizedEmail}. ${retryAfterSeconds}s remaining.`);
      throw new AppError(
        429,
        `Please wait ${retryAfterSeconds} second(s) before requesting a new code.`
      );
    }
    console.info(`[AuthService:resendOtp] Generating new OTP and resetting timers for: ${normalizedEmail}`);
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const resendAvailableAt = new Date(now.getTime() + 59 * 1000);
    const expiresAt = new Date(now.getTime() + 3 * 60 * 1000);
    await db
      .update(pendingRegistrations)
      .set({
        hashedOtp,
        failedAttempts: 0,
        resendAvailableAt,
        expiresAt,
        createdAt: now,
      })
      .where(eq(pendingRegistrations.email, normalizedEmail));

    console.info(`[AuthService:resendOtp] Dispatching new OTP email to: ${normalizedEmail}`);
    await emailService.sendOtpEmail(normalizedEmail, rawOtp);
    console.info(`[AuthService:resendOtp] OTP resent successfully to: ${normalizedEmail}`);
  }
}

export const authService = new AuthService();

// Handles record upsert operations.
