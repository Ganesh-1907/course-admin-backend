import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { CustomRequest } from '../types/common';
import { Admin } from '../models';
import { AppError } from './errorHandler';

export const verifyToken = (req: CustomRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No authorization token provided');
    }

    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, config.JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, 'Invalid or expired token');
  }
};

export const verifyAdmin = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'No user found in request');
    }

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      throw new AppError(404, 'Admin not found');
    }

    if (!admin.isActive) {
      throw new AppError(403, 'Admin account is inactive');
    }

    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      throw new AppError(403, 'Insufficient permissions');
    }

    next();
  } catch (error) {
    next(error);
  }
};
