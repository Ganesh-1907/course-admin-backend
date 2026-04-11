import express from 'express';
import adminAuthRoutes from './admin/authRoutes';
import adminCourseRoutes from './admin/courseRoutes';
import adminRegistrationRoutes from './admin/registrationRoutes';
import adminDashboardRoutes from './admin/dashboardRoutes';
import adminEnquiryRoutes from './admin/enquiryRoutes';
import adminAuthRoutes from './admin/authRoutes';
import adminCourseRoutes from './admin/courseRoutes';
import adminMentorRoutes from './admin/mentorRoutes';
import adminWebinarRoutes from './admin/webinarRoutes';
import adminRegistrationRoutes from './admin/registrationRoutes';
import adminDashboardRoutes from './admin/dashboardRoutes';
import userAuthRoutes from './user/authRoutes';
import userCourseRoutes from './user/courseRoutes';
import userRegistrationRoutes from './user/registrationRoutes';
import userCartRoutes from './user/cartRoutes';
import userPaymentRoutes from './user/paymentRoutes';
import userEnquiryRoutes from './user/enquiryRoutes';

const router = express.Router();

/**
 * Admin Routes
 */
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/courses', adminCourseRoutes);
router.use('/admin/registrations', adminRegistrationRoutes);
router.use('/admin/dashboard', adminDashboardRoutes);
router.use('/admin/enquiries', adminEnquiryRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/courses', adminCourseRoutes);
router.use('/admin/mentors', adminMentorRoutes);
router.use('/admin/webinars', adminWebinarRoutes);
router.use('/admin/registrations', adminRegistrationRoutes);
router.use('/admin/dashboard', adminDashboardRoutes);

/**
 * User Routes
 */
router.use('/user/auth', userAuthRoutes);
router.use('/user/courses', userCourseRoutes);
router.use('/user/registrations', userRegistrationRoutes);
router.use('/user/cart', userCartRoutes);
router.use('/user/payments', userPaymentRoutes);
router.use('/user/enquiries', userEnquiryRoutes);

/**
 * Health Check
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
