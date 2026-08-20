import nodemailer from "nodemailer";
import { env } from "../config/env";
import { AccountDetailsEmailPayload } from "../types/accountDetailsEmailPayload";
import { TransactionEmailPayload } from "../types/transactionsEmailPayload";
class EmailService{
    private transporter = nodemailer.createTransport({
        host : env.host!,
        port:Number(env.smtp_port!),
        secure:false,
        auth:{
            user:env.smtp_user,
            pass:env.smtp_pass
        }
    })

    async sendOtpEmail(to:string, otp:string){
        const mailOptions = {
            from : `"Arth" <${env.smtp_user}>`,
            to,
            subject : "OTP for Email Verification",

            html:`
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1a365d;">Email Verification</h2>
          <p>Use the following 6-digit One-Time Password (OTP) to complete your registration:</p>
          <div style="background-color: #f7fafc; padding: 12px; text-align: center; border-radius: 4px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #2b6cb0;">${otp}</span>
          </div>
          <p style="font-size: 13px; color: #718096;">This code is valid for <strong>3 minutes</strong>. If you did not request this, please ignore this email.</p>
        </div>
        `,
        }

        await this.transporter.sendMail(mailOptions);
    }

    async sendAccountDetails(payload:AccountDetailsEmailPayload){
        console.log("Sending email")
        const { to, firstName, customerId, accountNumber, accountType, branchCode } = payload;
        const mailOptions = {
        from : `"Arth" <${env.smtp_user}>`,
            to,
            subject : "Arth - Hulku re Account Activate Ho gya re!!!",
        html:`
        <>
        <h2>Welcome to Your Banking Portal</h2>
        <p>Hello ${firstName},</p>
        <p>Your account has been verified and activated by our administration team. Here are your account details:</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Customer ID:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${customerId}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Account Number:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${accountNumber}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Account Type:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${accountType.toUpperCase()}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Branch Code:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${branchCode}</td></tr>
        </table>
         <p>You can now proceed to log in to your account.</p>
        </>
        `
    }
    await this.transporter.sendMail(mailOptions);
    console.log('email sent')
}

async sendTransactionEmail(payload: TransactionEmailPayload) {
  const {
    to,
    firstName,
    transactionId,
    referenceNumber,
    type,
    amount,
    currency,
    accountNumber,
    description,
    balance,
    createdAt,
  } = payload;

  const isCredit = type === 'DEPOSIT';

  const transactionLabel =
    type === 'DEPOSIT'
      ? 'Deposit'
      : type === 'WITHDRAWAL'
        ? 'Withdrawal'
        : 'Transfer';

  const amountPrefix = isCredit ? '' : '';

  const formattedDate = createdAt.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const mailOptions = {
    from: `"Arth" <${env.smtp_user}>`,
    to,
    subject: `Arth - ${transactionLabel} of ${currency} ${amount} ${isCredit ? 'Credited' : 'Processed'}`,

    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          background-color: #f8fafc;
          padding: 32px 16px;
        "
      >
        <div
          style="
            max-width: 560px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          "
        >

          <!-- Header -->
          <div
            style="
              background-color: #0f172a;
              padding: 24px;
              color: #ffffff;
            "
          >
            <h2 style="margin: 0; font-size: 20px;">
              Arth
            </h2>

            <p
              style="
                margin: 6px 0 0;
                color: #cbd5e1;
                font-size: 13px;
              "
            >
              Transaction Notification
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 28px 24px;">

            <p
              style="
                margin: 0 0 8px;
                color: #334155;
                font-size: 15px;
              "
            >
              Hello ${firstName},
            </p>

            <p
              style="
                margin: 0 0 24px;
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
              "
            >
              Your ${transactionLabel.toLowerCase()} has been successfully
              processed.
            </p>

            <!-- Amount -->
            <div
              style="
                background-color: ${isCredit ? '#ecfdf5' : '#f8fafc'};
                border: 1px solid ${isCredit ? '#a7f3d0' : '#e2e8f0'};
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin-bottom: 24px;
              "
            >
              <p
                style="
                  margin: 0 0 6px;
                  color: #64748b;
                  font-size: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                "
              >
                ${transactionLabel} Amount
              </p>

              <p
                style="
                  margin: 0;
                  color: ${isCredit ? '#047857' : '#0f172a'};
                  font-size: 28px;
                  font-weight: bold;
                "
              >
                ${amountPrefix} ${currency} ${amount}
              </p>
            </div>

            <!-- Transaction Details -->
            <table
              style="
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
              "
            >
              <tr>
                <td
                  style="
                    padding: 10px 0;
                    color: #64748b;
                    border-bottom: 1px solid #f1f5f9;
                  "
                >
                  Transaction Type
                </td>

                <td
                  style="
                    padding: 10px 0;
                    text-align: right;
                    color: #0f172a;
                    font-weight: 600;
                    border-bottom: 1px solid #f1f5f9;
                  "
                >
                  ${transactionLabel}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding: 10px 0;
                    color: #64748b;
                    border-bottom: 1px solid #f1f5f9;
                  "
                >
                  Reference Number
                </td>

                <td
                  style="
                    padding: 10px 0;
                    text-align: right;
                    color: #0f172a;
                    font-family: monospace;
                    border-bottom: 1px solid #f1f5f9;
                  "
                >
                  ${referenceNumber}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding: 10px 0;
                    color: #64748b;
                    border-bottom: 1px solid #f1f5f9;
                  "
                >
                  Account Number
                </td>

                <td
                  style="
                    padding: 10px 0;
                    text-align: right;
                    color: #0f172a;
                    font-family: monospace;
                    border-bottom: 1px solid #f1f5f9;
                  "
                >
                  ${accountNumber}
                </td>
              </tr>

              ${
                description
                  ? `
                    <tr>
                      <td
                        style="
                          padding: 10px 0;
                          color: #64748b;
                          border-bottom: 1px solid #f1f5f9;
                        "
                      >
                        Description
                      </td>

                      <td
                        style="
                          padding: 10px 0;
                          text-align: right;
                          color: #0f172a;
                          border-bottom: 1px solid #f1f5f9;
                        "
                      >
                        ${description}
                      </td>
                    </tr>
                  `
                  : ''
              }

              <tr>
                <td
                  style="
                    padding: 10px 0;
                    color: #64748b;
                    border-bottom: 1px solid #f1f5f9;
                  "
                >
                  Date & Time
                </td>

                <td
                  style="
                    padding: 10px 0;
                    text-align: right;
                    color: #0f172a;
                    border-bottom: 1px solid #f1f5f9;
                  "
                >
                  ${formattedDate}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding: 10px 0;
                    color: #64748b;
                  "
                >
                  Available Balance
                </td>

                <td
                  style="
                    padding: 10px 0;
                    text-align: right;
                    color: #0f172a;
                    font-weight: 600;
                  "
                >
                  ${currency} ${balance}
                </td>
              </tr>
            </table>

            <!-- Security Notice -->
            <div
              style="
                margin-top: 24px;
                padding: 12px;
                background-color: #f8fafc;
                border-radius: 6px;
              "
            >
              <p
                style="
                  margin: 0;
                  color: #64748b;
                  font-size: 12px;
                  line-height: 1.5;
                "
              >
                If you did not authorize this transaction, please contact
                Arth support immediately.
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div
            style="
              padding: 16px 24px;
              background-color: #f8fafc;
              border-top: 1px solid #e2e8f0;
            "
          >
            <p
              style="
                margin: 0;
                color: #94a3b8;
                font-size: 11px;
                text-align: center;
              "
            >
              This is an automated transaction notification from Arth.
              Please do not reply to this email.
            </p>
          </div>

        </div>
      </div>
    `,
  };

  await this.transporter.sendMail(mailOptions);
}
}

export const emailService = new EmailService();

/*
jargons:

    sendmail() -->an async function, takes the email instructions here(mailOptions) and format that into standard internet email format (RFC 5322 MIME text),
                    and transmits them over tcp connection destination SMTP server.
    
    this.transporter --> refers to the private nodemailer transporter object created on the emailServices class
                        contains the config like port and auth credentials.
    
    
*/