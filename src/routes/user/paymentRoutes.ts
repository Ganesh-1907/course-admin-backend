import express from 'express';
import {
    createRazorpayOrder,
    verifyRazorpayPayment,
    createStripePaymentIntent,
    verifyStripePayment
} from '../../controllers/user/paymentController';
import { optionalVerifyToken } from '../../middleware/auth';

const router = express.Router();

router.use(optionalVerifyToken);

/**
 * @route   POST /api/user/payments/create-order
 * @desc    Create a Razorpay order
 * @access  Public (Self-handles auth if token provided)
 */
router.post('/create-order', createRazorpayOrder);

/**
 * @route   POST /api/user/payments/verify-payment
 * @desc    Verify payment signature and complete registration
 * @access  Public (Self-handles auth if token provided)
 */
router.post('/verify-payment', verifyRazorpayPayment);
router.post('/verify', verifyRazorpayPayment);

// Stripe Routes
router.post('/stripe/create-intent', createStripePaymentIntent);
router.post('/stripe/verify', verifyStripePayment);

export default router;
