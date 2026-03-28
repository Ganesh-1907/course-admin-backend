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


export default router;
