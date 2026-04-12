import { Router } from 'express';
import { submitEnquiry, getAllEnquiries, updateEnquiry } from '../../controllers/user/enquiryController';

const router = Router();

// Public route for submitting enquiries
router.post('/submit', submitEnquiry);

// Protected or Admin route for getting all enquiries (can be moved to admin routes later)
router.get('/all', getAllEnquiries);

// Update enquiry (effectively for admin)
router.patch('/:id', updateEnquiry);

export default router;
