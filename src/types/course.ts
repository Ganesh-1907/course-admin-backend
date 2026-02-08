// Course related types
import type { Document } from 'mongoose';

export interface ICourse extends Document {
  _id: string;
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
  createdBy: string;
  enrollmentCount: number;
  difficultyLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  duration?: number;
  maxParticipants?: number;
  capacityRemaining?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseRequest {
  courseName: string;
  description?: string;
  mentor: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  price: number;
  discountPercentage?: number;
  difficultyLevel?: string;
  duration?: number;
  maxParticipants?: number;
}
