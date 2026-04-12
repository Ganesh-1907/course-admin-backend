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

export const sendEnquiryEmail = async (enquiry: any) => {
  const adminSubject = `New Enquiry Received: ${enquiry.enquiryType}`;
  const adminMessage = `A new enquiry has been submitted.
  
Name: ${enquiry.fullName}
Email: ${enquiry.email}
Phone: ${enquiry.phoneNumber}
Type: ${enquiry.enquiryType}
Subject/Course: ${enquiry.courseName || 'N/A'}
Message: ${enquiry.message || 'N/A'}
${enquiry.education ? `Education: ${enquiry.education}` : ''}
  `;

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #051d33; border-bottom: 2px solid #f97316; padding-bottom: 10px;">New Enquiry Details</h2>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold; width: 150px;">Name:</td><td style="padding: 8px 0;">${enquiry.fullName}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${enquiry.email}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">${enquiry.phoneNumber}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Type:</td><td style="padding: 8px 0;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${enquiry.enquiryType}</span></td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Subject/Course:</td><td style="padding: 8px 0;">${enquiry.courseName || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Message:</td><td style="padding: 8px 0;">${enquiry.message || 'N/A'}</td></tr>
          ${enquiry.education ? `<tr><td style="padding: 8px 0; font-weight: bold;">Education:</td><td style="padding: 8px 0;">${enquiry.education}</td></tr>` : ''}
        </table>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">
        This is an automated notification from the Viovn Course Management System.
      </p>
    </div>
  `;

  // Send to admin
  await sendEmail({
    email: config.SMTP.FROM_EMAIL, // For now sending to the system from_email as admin notification
    subject: adminSubject,
    message: adminMessage,
    html: adminHtml,
  });

  // Send confirmation to user
  const userSubject = 'Thank you for your enquiry - Viovn';
  const userHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #f97316;">Enquiry Received</h2>
      <p>Hello ${enquiry.fullName},</p>
      <p>Thank you for reaching out to us. We have received your enquiry regarding <strong>${enquiry.courseName || enquiry.enquiryType}</strong>.</p>
      <p>Our team will review your request and get back to you shortly.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b;">Best regards,<br />Viovn EduTech Team</p>
    </div>
  `;

  await sendEmail({
    email: enquiry.email,
    subject: userSubject,
    message: `Hello ${enquiry.fullName}, Thank you for reaching out. We have received your enquiry and will get back to you shortly.`,
    html: userHtml,
  });
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
