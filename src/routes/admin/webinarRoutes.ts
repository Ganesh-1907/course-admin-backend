import express from 'express';
import * as webinarController from '../../controllers/admin/webinarController';
import { verifyToken, verifyAdmin } from '../../middleware/auth';

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get('/', webinarController.getAllWebinars);
router.get('/:webinarId', webinarController.getWebinarById);
router.post('/', webinarController.createWebinar);

export default router;
