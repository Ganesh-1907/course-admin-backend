import express from 'express';
import * as mentorController from '../../controllers/admin/mentorController';
import { verifyToken, verifyAdmin } from '../../middleware/auth';

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get('/', mentorController.getAllMentors);
router.get('/:mentorId', mentorController.getMentorById);
router.post('/', mentorController.createMentor);
router.put('/:mentorId', mentorController.updateMentor);

export default router;
