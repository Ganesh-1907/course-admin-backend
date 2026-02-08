// Common API response types
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}

// Request user info from JWT
export interface AuthRequest {
  user?: {
    id: string;
    role: string;
  };
}

// Custom Express Request type
import { Request } from 'express';

export interface CustomRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  file?: Express.Multer.File;
  activityAction?: string;
  activityDescription?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
}

// Pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
