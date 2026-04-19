import nodemailer from 'nodemailer';
import config from '../config/env';

const transporter = nodemailer.createTransport({
  host: config.SMTP.HOST,
  port: config.SMTP.PORT,
  secure: config.SMTP.PORT === 465,
  auth: config.SMTP.USER && config.SMTP.PASS
    ? {
        user: config.SMTP.USER,
        pass: config.SMTP.PASS,
      }
    : undefined,
});

const getSenderEmail = () => config.SMTP.USER || config.SMTP.FROM_EMAIL;
const getNotificationInbox = () => config.SMTP.USER || config.SMTP.FROM_EMAIL;

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (amount: number, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_error) {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (value?: Date | string | null) => {
  if (!value) {
    return 'To be announced';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'To be announced';
  }

  return parsed.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const sendEmail = async (options: {
  email: string;
  subject: string;
  message: string;
  html?: string;
}) => {
  const mailOptions = {
    from: `${config.SMTP.FROM_NAME} <${getSenderEmail()}>`,
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
          <tr><td style="padding: 8px 0; font-weight: bold; width: 150px;">Name:</td><td style="padding: 8px 0;">${escapeHtml(enquiry.fullName)}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">${escapeHtml(enquiry.email)}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">${escapeHtml(enquiry.phoneNumber)}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Type:</td><td style="padding: 8px 0;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${escapeHtml(enquiry.enquiryType)}</span></td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Subject/Course:</td><td style="padding: 8px 0;">${escapeHtml(enquiry.courseName || 'N/A')}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Message:</td><td style="padding: 8px 0;">${escapeHtml(enquiry.message || 'N/A')}</td></tr>
          ${enquiry.education ? `<tr><td style="padding: 8px 0; font-weight: bold;">Education:</td><td style="padding: 8px 0;">${escapeHtml(enquiry.education)}</td></tr>` : ''}
        </table>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">
        This is an automated notification from the Viovn Course Management System.
      </p>
    </div>
  `;

  await sendEmail({
    email: getNotificationInbox(),
    subject: adminSubject,
    message: adminMessage,
    html: adminHtml,
  });

  const userSubject = 'Thank you for your enquiry - Viovn';
  const userHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #f97316;">Enquiry Received</h2>
      <p>Hello ${escapeHtml(enquiry.fullName)},</p>
      <p>Thank you for reaching out to us. We have received your enquiry regarding <strong>${escapeHtml(enquiry.courseName || enquiry.enquiryType)}</strong>.</p>
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
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${escapeHtml(otp)}</span>
      </div>
      <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280;">Best regards,<br />Viovn EduTech Team</p>
    </div>
  `;

  await sendEmail({ email, subject, message, html });
};

export const sendPaymentConfirmationEmail = async (details: {
  email: string;
  customerName: string;
  paymentGateway: string;
  paymentId: string;
  totalAmount: number;
  currency?: string;
  registrations: Array<{
    registrationNumber: string;
    courseName: string;
    mentorName?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    amountPaid?: number | string | null;
  }>;
}) => {
  const currency = details.currency || 'INR';
  const safeName = escapeHtml(details.customerName || 'Learner');
  const safeGateway = escapeHtml(details.paymentGateway.toUpperCase());
  const safePaymentId = escapeHtml(details.paymentId);
  const registrationsHtml = details.registrations
    .map((registration) => {
      const amountValue = Number(registration.amountPaid ?? 0);

      return `
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; background: #f8fafc;">
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">${escapeHtml(registration.courseName)}</div>
          <div style="font-size: 13px; color: #334155; line-height: 1.7;">
            <div><strong>Registration No:</strong> ${escapeHtml(registration.registrationNumber)}</div>
            <div><strong>Mentor:</strong> ${escapeHtml(registration.mentorName || 'To be assigned')}</div>
            <div><strong>Start Date:</strong> ${escapeHtml(formatDate(registration.startDate))}</div>
            <div><strong>End Date:</strong> ${escapeHtml(formatDate(registration.endDate))}</div>
            <div><strong>Amount:</strong> ${escapeHtml(formatCurrency(Number.isFinite(amountValue) ? amountValue : 0, currency))}</div>
          </div>
        </div>
      `;
    })
    .join('');

  const registrationNumbers = details.registrations.map((registration) => registration.registrationNumber).join(', ');
  const totalAmountFormatted = formatCurrency(details.totalAmount, currency);

  const subject =
    details.registrations.length === 1
      ? `Payment confirmed for ${details.registrations[0].courseName}`
      : `Payment confirmed for ${details.registrations.length} course enrollments`;

  const message = [
    `Hello ${details.customerName},`,
    '',
    'Your payment has been received successfully.',
    `Payment gateway: ${details.paymentGateway.toUpperCase()}`,
    `Payment ID: ${details.paymentId}`,
    `Total paid: ${totalAmountFormatted}`,
    `Registration numbers: ${registrationNumbers}`,
    '',
    'We have confirmed your enrollment and our team will reach out if anything else is required.',
    '',
    'Thank you,',
    'Viovn Technologies',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #334155; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0; color: #0f172a;">Payment Confirmed</h2>
        <p style="margin: 8px 0 0; font-size: 14px; color: #475569;">Your order has been confirmed successfully.</p>
      </div>

      <p style="font-size: 14px; line-height: 1.7;">Hello ${safeName},</p>
      <p style="font-size: 14px; line-height: 1.7;">
        We received your payment and confirmed your enrollment. Here are your order details:
      </p>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 14px; line-height: 1.8;">
          <div><strong>Payment Gateway:</strong> ${safeGateway}</div>
          <div><strong>Payment ID:</strong> ${safePaymentId}</div>
          <div><strong>Total Paid:</strong> ${escapeHtml(totalAmountFormatted)}</div>
          <div><strong>Registration Numbers:</strong> ${escapeHtml(registrationNumbers)}</div>
        </div>
      </div>

      ${registrationsHtml}

      <p style="font-size: 14px; line-height: 1.7; margin-top: 24px;">
        If you have any questions, just reply to this email and our team will help you.
      </p>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
        Best regards,<br />
        Viovn Technologies
      </p>
    </div>
  `;

  await sendEmail({
    email: details.email,
    subject,
    message,
    html,
  });

  const notificationInbox = getNotificationInbox();
  if (notificationInbox && notificationInbox.toLowerCase() !== details.email.toLowerCase()) {
    await sendEmail({
      email: notificationInbox,
      subject: `[Admin Copy] ${subject}`,
      message,
      html,
    });
  }
};
