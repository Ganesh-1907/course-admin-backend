import express from 'express';
import * as registrationController from '../../controllers/admin/registrationController';
import { verifyToken, verifyAdmin } from '../../middleware/auth';

const router = express.Router();

/**
 * Protected Routes
 */
router.use(verifyToken, verifyAdmin); // Apply middleware to all routes below

// Registration management
router.get('/export', registrationController.exportRegistrations);
router.get('/', registrationController.getAllRegistrations);
router.get('/detail/:registrationId', registrationController.getRegistrationDetail);
router.patch('/:registrationId/status', registrationController.updateRegistrationStatus);
router.patch('/:registrationId/cancel', registrationController.cancelUserRegistration);

// Certificate and Payment
router.post('/:registrationId/certificate', registrationController.issueCertificate);
router.get('/:registrationId/payment', registrationController.getPaymentDetails);

// Dashboard
router.get('/dashboard/statistics', registrationController.getDashboardStats);

export default router;
