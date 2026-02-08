// Participant/User related types
import type { Document } from 'mongoose';

export interface IParticipant extends Document {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  alternateMobile?: string;
  registeredCourses: Array<{
    courseId: string;
    registrationId: string;
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

export interface RegisterUserRequest {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface LoginUserRequest {
  email: string;
  password: string;
}
