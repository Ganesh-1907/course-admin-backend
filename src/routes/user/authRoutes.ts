import express from 'express';
import * as authController from '../../controllers/user/authController';
import { verifyToken } from '../../middleware/auth';

const router = express.Router();

/**
 * Public Routes
 */
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

/**
 * Protected Routes
 */
router.use(verifyToken); // Apply middleware to all routes below

router.get('/profile', authController.getUserProfile);
router.put('/profile', authController.updateUserProfile);
router.put('/change-password', authController.changePassword);

export default router;
