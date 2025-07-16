import nodemailer from "nodemailer";
import { Service } from "typedi";

@Service()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendResetPasswordEmail(to: string, resetToken: string) {
    const resetUrl = `https://cms.revalize.io/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: `Revalyze Support`,
      to,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });
  }
}
