import express from 'express';
import * as courseController from '../../controllers/user/courseController';

const router = express.Router();

/**
 * Public Routes - No authentication required
 */

// Course browsing
router.get('/service-types', courseController.getServiceTypes);
router.get('/', courseController.getAllCourses);
router.get('/v2/recent-schedule', courseController.getRecentScheduleByCourseName);
router.get('/v2/all-schedules', courseController.getAllSchedulesByCourseName);
router.get('/v2/mentors', courseController.getMentorsByCourseName);
router.get('/v2/trainers', courseController.getPublicMentors);
router.get('/v2/schedules-by-type/:serviceType', courseController.getSchedulesByServiceType);
router.get('/type/:serviceType', courseController.getCoursesByType);
router.get('/:courseId', courseController.getCourseDetails);

export default router;
