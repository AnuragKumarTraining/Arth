
import nodemailer from "nodemailer";
import { env } from "../config/env";


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
}

export const emailService = new EmailService();

/*
jargons:

    sendmail() -->an async function, takes the email instructions here(mailOptions) and format that into standard internet email format (RFC 5322 MIME text),
                    and transmits them over tcp connection destination SMTP server.
    
    this.transporter --> refers to the private nodemailer transporter object created on the emailServices class
                        contains the config like port and auth credentials.
    
    
*/