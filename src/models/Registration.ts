import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistration extends Document {
  participantId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
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

const registrationSchema = new Schema<IRegistration>(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: [true, 'Participant ID is required'],
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true,
    },
    registrationNumber: {
      type: String,
      unique: true,
      index: true,
    },
    paymentId: {
      type: String,
      trim: true,
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'Cash'],
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    amountPaid: {
      type: Number,
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP'],
    },
    transactionDate: {
      type: Date,
    },
    paymentReceipt: {
      url: String,
      fileName: String,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discountApplied: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      default: 'PERCENTAGE',
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    registrationStatus: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED', 'PENDING', 'COMPLETED'],
      default: 'PENDING',
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancellationDate: {
      type: Date,
    },
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    certificate: {
      url: String,
      certificateNumber: String,
      issueDate: Date,
    },
    attendancePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    courseCompleted: {
      type: Boolean,
      default: false,
    },
    completionDate: {
      type: Date,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'registrations',
  }
);

registrationSchema.index({ participantId: 1, courseId: 1 });
registrationSchema.index({ paymentStatus: 1, registrationStatus: 1 });
registrationSchema.index({ createdAt: -1 });

registrationSchema.pre<IRegistration>('save', async function (next) {
  if (!this.registrationNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.registrationNumber = `REG${timestamp}${random}`;
  }
  next();
});

export const Registration = mongoose.model<IRegistration>('Registration', registrationSchema);
