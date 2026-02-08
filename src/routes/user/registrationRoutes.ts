import express from 'express';
import * as registrationController from '../../controllers/user/registrationController';
import { verifyToken } from '../../middleware/auth';

const router = express.Router();

/**
 * Protected Routes
 */
router.use(verifyToken); // Apply middleware to all routes below

// Registration management
router.post('/', registrationController.registerForCourse);
router.get('/', registrationController.getUserRegistrations);
router.get('/:registrationId', registrationController.getRegistrationDetails);

// Payment
router.post('/:registrationId/payment', registrationController.processPayment);

// Review and feedback
router.post('/:registrationId/review', registrationController.submitReview);

// Cancellation
router.patch('/:registrationId/cancel', registrationController.cancelRegistration);

// Certificate
router.get('/:registrationId/certificate', registrationController.downloadCertificate);

export default router;
