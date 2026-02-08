// Admin related types
import type { Document } from 'mongoose';

export interface IAdmin extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'super_admin' | 'moderator';
  isActive: boolean;
  resetToken?: string;
  resetTokenExpiry?: Date;
  lastLogin?: Date;
  phone?: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminResponse {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}
