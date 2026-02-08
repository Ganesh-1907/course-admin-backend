import express from 'express';
import multer from 'multer';
import * as courseController from '../../controllers/admin/courseController';
import { verifyToken, verifyAdmin } from '../../middleware/auth';
import { uploadBrochure } from '../../middleware/upload';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Protected Routes
 */
router.use(verifyToken, verifyAdmin); // Apply middleware to all routes below

// CRUD operations
router.post('/', uploadBrochure.single('brochure'), courseController.createCourse);
router.get('/', courseController.getAllCourses);
router.post('/import', upload.single('file'), courseController.importCourses);
router.get('/:courseId', courseController.getCourseById);
router.put('/:courseId', uploadBrochure.single('brochure'), courseController.updateCourse);
router.delete('/:courseId', courseController.deleteCourse);

// Course actions
router.patch('/:courseId/activate', courseController.activateCourse);
router.patch('/:courseId/deactivate', courseController.deactivateCourse);

export default router;
