import nodemailer from 'nodemailer';
import config from '../config/env';

const transporter = nodemailer.createTransport({
  host: config.SMTP.HOST,
  port: config.SMTP.PORT,
  secure: config.SMTP.PORT === 465, // true for 465, false for other ports
  auth: {
    user: config.SMTP.USER,
    pass: config.SMTP.PASS,
  },
});

export const sendEmail = async (options: {
  email: string;
  subject: string;
  message: string;
  html?: string;
}) => {
  const mailOptions = {
    from: `${config.SMTP.FROM_NAME} <${config.SMTP.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export const sendOTPEmail = async (email: string, otp: string) => {
  const subject = 'Password Reset OTP';
  const message = `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #f97316;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>You requested to reset your password. Please use the following One-Time Password (OTP) to proceed:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otp}</span>
      </div>
      <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280;">Best regards,<br />Viovn EduTech Team</p>
    </div>
  `;

  await sendEmail({ email, subject, message, html });
};
