import express from 'express';
import * as webinarController from '../../controllers/user/webinarController';

const router = express.Router();

/**
 * Public Routes - No authentication required
 */
router.get('/', webinarController.getAllWebinars);
router.get('/:webinarId', webinarController.getWebinarById);

export default router;
