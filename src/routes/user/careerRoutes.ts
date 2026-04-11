import { Router } from 'express';
import * as careerController from '../../controllers/user/careerController';
import { uploadResume } from '../../middleware/upload';

const router = Router();

router.get('/', careerController.getAllCareers);
router.get('/departments', careerController.getDepartments);
router.get('/:id', careerController.getCareerById);
router.post('/apply', uploadResume.single('resume'), careerController.applyForJob);

export default router;
