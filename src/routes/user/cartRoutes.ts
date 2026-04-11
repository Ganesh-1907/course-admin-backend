import express from 'express';
import * as cartController from '../../controllers/user/cartController';

import { verifyToken, optionalVerifyToken } from '../../middleware/auth';

const router = express.Router();

/**
 * Cart Routes
 */
router.post('/add', verifyToken, cartController.addToCart);
router.get('/', optionalVerifyToken, cartController.getCart);
router.delete('/:courseId', verifyToken, cartController.removeFromCart);
router.post('/clear', verifyToken, cartController.clearCart);

export default router;
