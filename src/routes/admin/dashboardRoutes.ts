import express from 'express';
import * as dashboardController from '../../controllers/admin/dashboardController';
import { verifyToken, verifyAdmin } from '../../middleware/auth';

const router = express.Router();

// Apply middleware to all dashboard routes
router.use(verifyToken, verifyAdmin);

router.get('/stats', dashboardController.getDashboardStats);

export default router;
