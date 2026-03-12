import express from 'express';
import * as courseController from '../../controllers/user/courseController';

const router = express.Router();

/**
 * Public Routes - No authentication required
 */

// Course browsing
router.get('/', courseController.getAllCourses);
router.get('/search', courseController.searchCourses);
router.get('/type/:serviceType', courseController.getCoursesByType);
router.get('/:courseId', courseController.getCourseDetails);

export default router;
