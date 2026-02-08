import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant extends Document {
  name: string;
  email: string;
  mobile: string;
  password?: string;
  alternateMobile?: string;
  registeredCourses: Array<{
    courseId: mongoose.Types.ObjectId;
    registrationId: mongoose.Types.ObjectId;
    registrationDate: Date;
  }>;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  organization?: string;
  designation?: string;
  yearsOfExperience?: number;
  profilePicture?: {
    url?: string;
    fileName?: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  emailVerificationToken?: string;
  preferences?: {
    newsletter: boolean;
    notifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>(
  {
    name: {
      type: String,
      required: [true, 'Participant name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
      index: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      match: [
        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
        'Please provide a valid mobile number',
      ],
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    alternateMobile: {
      type: String,
      trim: true,
    },
    registeredCourses: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
        },
        registrationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Registration',
        },
        registrationDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    organization: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    profilePicture: {
      url: String,
      fileName: String,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    preferences: {
      newsletter: {
        type: Boolean,
        default: true,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    collection: 'participants',
  }
);

participantSchema.index({ email: 1 });
participantSchema.index({ mobile: 1 });
participantSchema.index({ status: 1 });
participantSchema.index({ 'registeredCourses.courseId': 1 });

export const Participant = mongoose.model<IParticipant>('Participant', participantSchema);
