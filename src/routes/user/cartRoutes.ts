import express from 'express';
import * as cartController from '../../controllers/user/cartController';

const router = express.Router();

/**
 * Cart Routes
 */
router.post('/add', cartController.addToCart);
router.get('/', cartController.getCart);
router.delete('/:courseId', cartController.removeFromCart);
router.post('/clear', cartController.clearCart);

export default router;
