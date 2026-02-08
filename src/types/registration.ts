// Registration related types
import type { Document } from 'mongoose';

export interface IRegistration extends Document {
  _id: string;
  participantId: string;
  courseId: string;
  registrationNumber: string;
  paymentId?: string;
  paymentMode?: 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'Cash';
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  amountPaid?: number;
  currency: string;
  transactionDate?: Date;
  paymentReceipt?: {
    url?: string;
    fileName?: string;
  };
  originalPrice: number;
  discountApplied: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  finalAmount: number;
  registrationStatus: 'CONFIRMED' | 'CANCELLED' | 'PENDING' | 'COMPLETED';
  cancellationReason?: string;
  cancellationDate?: Date;
  certificateIssued: boolean;
  certificate?: {
    url?: string;
    certificateNumber?: string;
    issueDate?: Date;
  };
  attendancePercentage: number;
  courseCompleted: boolean;
  completionDate?: Date;
  rating?: number;
  review?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterForCourseRequest {
  courseId: string;
}

export interface ProcessPaymentRequest {
  paymentMode: string;
  paymentId: string;
  amountPaid: number;
}

export interface SubmitReviewRequest {
  rating: number;
  review?: string;
}
