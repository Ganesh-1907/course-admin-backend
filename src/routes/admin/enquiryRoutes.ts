import express from 'express';
import * as enquiryController from '../../controllers/admin/enquiryController';
import { verifyToken, verifyAdmin } from '../../middleware/auth';

const router = express.Router();

/**
 * All routes protected by admin auth
 */
router.use(verifyToken, verifyAdmin);

// GET /api/admin/enquiries - List all enquiries (with search, filter, pagination)
router.get('/', enquiryController.getAllEnquiries);

// GET /api/admin/enquiries/:id - Get single enquiry
router.get('/:id', enquiryController.getEnquiryById);

// PATCH /api/admin/enquiries/:id - Update enquiry status/notes
router.patch('/:id', enquiryController.updateEnquiry);

// DELETE /api/admin/enquiries/:id - Delete enquiry
router.delete('/:id', enquiryController.deleteEnquiry);

export default router;
