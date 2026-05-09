import { Router } from 'express';
import { submitEnquiry, getAllEnquiries, updateEnquiry } from '../../controllers/user/enquiryController';

const router = Router();

// Public route for submitting enquiries
router.post('/submit', submitEnquiry);

export default router;
