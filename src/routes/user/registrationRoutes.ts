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

// Cancellation
router.patch('/:registrationId/cancel', registrationController.cancelRegistration);

export default router;
