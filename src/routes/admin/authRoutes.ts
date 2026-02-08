import express from 'express';
import * as authController from '../../controllers/admin/authController';
import { verifyToken, verifyAdmin } from '../../middleware/auth';

const router = express.Router();

/**
 * Public Routes
 */
router.post('/login', authController.adminLogin);

/**
 * Protected Routes
 */
router.use(verifyToken, verifyAdmin); // Apply middleware to all routes below

router.post('/logout', authController.adminLogout);
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/change-password', authController.changePassword);

export default router;
