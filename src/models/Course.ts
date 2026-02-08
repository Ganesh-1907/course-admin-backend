import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  courseId: string;
  courseName: string;
  description?: string;
  mentor: string;
  serviceType: 'Agile' | 'Service' | 'SAFe' | 'Project' | 'Quality' | 'Business' | 'Generative AI';
  startDate: Date;
  endDate: Date;
  price: number;
  discountPercentage: number;
  finalPrice: number;
  courseImage?: {
    url?: string;
    fileName?: string;
  };
  brochure?: {
    url?: string;
    fileName?: string;
  };
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  enrollmentCount: number;
  difficultyLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  duration?: number;
  maxParticipants?: number;
  capacityRemaining?: number;
  createdAt: Date;
  updatedAt: Date;
  language: 'English' | 'Spanish';
  startTime: string;
  endTime: string;
  batchType: 'Weekend' | 'Weekdays';
  courseType: 'Online' | 'Offline';
  address?: string;
  countryPricing: Array<{
    country: string;
    currency: string;
    price: number;
    discountPercentage: number;
    finalPrice: number;
  }>;
}

const courseSchema = new Schema<ICourse>(
  {
    courseId: {
      type: String,
      required: [true, 'Course ID is required'],
      unique: true,
      uppercase: true,
      index: true,
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      minlength: [3, 'Course name must be at least 3 characters'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    mentor: {
      type: String,
      required: [true, 'Mentor name is required'],
      trim: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: ['Agile', 'Service', 'SAFe', 'Project', 'Quality', 'Business', 'Generative AI'],
      required: [true, 'Service type is required'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    courseImage: {
      url: String,
      fileName: String,
    },
    brochure: {
      url: String,
      fileName: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    difficultyLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    duration: {
      type: Number,
      min: 1,
    },
    maxParticipants: {
      type: Number,
    },
    capacityRemaining: {
      type: Number,
    },
    language: {
      type: String,
      enum: ['English', 'Spanish'],
      default: 'English',
    },
    startTime: {
      type: String,
      required: false,
    },
    endTime: {
      type: String,
      required: false,
    },
    batchType: {
      type: String,
      enum: ['Weekend', 'Weekdays'],
      required: false,
    },
    courseType: {
      type: String,
      enum: ['Online', 'Offline'],
      required: false,
    },
    address: {
      type: String,
    },
    countryPricing: [{
      country: {
        type: String,
        required: true,
      },
      currency: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      discountPercentage: {
        type: Number,
        default: 0,
      },
      finalPrice: {
        type: Number,
        required: true,
      },
      _id: false, // Prevent creating subdocument IDs
    }],
  },
  {
    timestamps: true,
    collection: 'courses',
  }
);

courseSchema.index({ courseId: 1, isActive: 1 });
courseSchema.index({ serviceType: 1, isActive: 1 });
courseSchema.index({ startDate: -1, endDate: -1 });
courseSchema.index({ mentor: 1, isActive: 1 });
courseSchema.index({ createdBy: 1 });

courseSchema.pre<ICourse>('save', function (next) {
  if (this.isModified('price') || this.isModified('discountPercentage')) {
    const discountAmount = (this.price * this.discountPercentage) / 100;
    this.finalPrice = this.price - discountAmount;
  }

  // Also update countryPricing final prices if needed (although frontend will send them)
  if (this.isModified('countryPricing')) {
    this.countryPricing.forEach(pricing => {
      const discountAmount = (pricing.price * pricing.discountPercentage) / 100;
      pricing.finalPrice = pricing.price - discountAmount;
    });
  }

  next();
});

export const Course = mongoose.model<ICourse>('Course', courseSchema);
