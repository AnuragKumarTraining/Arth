import nodemailer from "nodemailer";
import { env } from "../config/env";
import { AccountDetailsEmailPayload } from "../types/accountDetailsEmailPayload";
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
}

export const emailService = new EmailService();

/*
jargons:

    sendmail() -->an async function, takes the email instructions here(mailOptions) and format that into standard internet email format (RFC 5322 MIME text),
                    and transmits them over tcp connection destination SMTP server.
    
    this.transporter --> refers to the private nodemailer transporter object created on the emailServices class
                        contains the config like port and auth credentials.
    
    
*/