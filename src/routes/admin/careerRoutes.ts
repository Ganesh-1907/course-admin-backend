import { Router } from 'express';
import * as careerController from '../../controllers/admin/careerController';
import { verifyToken, verifyAdmin } from '../../middleware/auth';

const router = Router();

// All admin career routes require authentication and admin role
router.use(verifyToken);
router.use(verifyAdmin);

router.get('/', careerController.getAllCareers);
router.post('/', careerController.createCareer);
router.put('/:id', careerController.updateCareer);
router.delete('/:id', careerController.deleteCareer);

router.get('/applications', careerController.getAllApplications);
router.patch('/applications/:id/status', careerController.updateApplicationStatus);

export default router;
