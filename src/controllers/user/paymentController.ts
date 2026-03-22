import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import {
    db,
    registrations,
    courseSchedules,
    users
} from '../../models';
import { eq, and, sql } from 'drizzle-orm';
import config from '../../config/env';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { formatResponse } from '../../utils/helpers';

const razorpay = new Razorpay({
    key_id: config.RAZORPAY.KEY_ID!,
    key_secret: config.RAZORPAY.KEY_SECRET!,
});

const stripe = new Stripe(config.STRIPE.SECRET_KEY!);

/**
 * Helper to process successful registration after payment
 */
async function processSuccessfulRegistration(
    userIdOrData: number | { name: string; email: string; phone?: string; mobile?: string },
    scheduleIds: (number | string)[],
    amount: number,
    paymentId: string,
    paymentGateway: string,
    reqUser?: any
) {
    // 1. Get or Create User
    let userId: number;
    if (typeof userIdOrData === 'number') {
        userId = userIdOrData;
    } else {
        const userData = userIdOrData;
        // Check if user exists by email
        const userResults = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);

        if (userResults.length > 0) {
            userId = userResults[0].id;
            // Update mobile if missing
            const userMobile = userData.mobile || userData.phone;
            if (!userResults[0].mobile && userMobile) {
                await db.update(users).set({ mobile: userMobile }).where(eq(users.id, userId));
            }
        } else {
            // Create new user (participant)
            const [newUser] = await db.insert(users).values({
                name: userData.name || 'Anonymous',
                email: userData.email,
                mobile: userData.mobile || userData.phone,
                password: crypto.randomBytes(8).toString('hex'), // Temporary random password
                role: 'participant',
            }).returning();
            userId = newUser.id;
        }
    }

    const createdRegistrations = [];
    const rawIds = Array.isArray(scheduleIds) ? scheduleIds : [scheduleIds];
    const ids = rawIds.map(id => typeof id === 'string' ? parseInt(id) : id).filter(id => !isNaN(id));

    if (ids.length === 0) {
        throw new AppError(400, 'At least one valid numeric schedule ID is required');
    }

    const amountPerRegistration = amount / ids.length;

    for (const sId of ids) {
        // Check for duplicate registration
        const existingRegistration = await db.select()
            .from(registrations)
            .where(and(
                eq(registrations.userId, userId),
                eq(registrations.scheduleId, sId),
                eq(registrations.paymentStatus, 'PAID')
            ))
            .limit(1);

        if (existingRegistration.length > 0) {
            createdRegistrations.push(existingRegistration[0]);
            continue;
        }

        // 3. Create Registration
        const timestamp = Date.now().toString().slice(-6);
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        const registrationNumber = `REG${timestamp}${random} `;

        const [newReg] = await db.insert(registrations).values({
            userId,
            scheduleId: sId,
            registrationNumber,
            paymentId: paymentId,
            paymentGateway: paymentGateway,
            amountPaid: amountPerRegistration.toFixed(2),
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            transactionDate: new Date(),
        }).returning();

        // 4. Update schedule enrollment counts
        await db.update(courseSchedules)
            .set({
                enrollmentCount: sql`${courseSchedules.enrollmentCount} + 1`,
                capacityRemaining: sql`CASE WHEN capacity_remaining IS NOT NULL THEN capacity_remaining - 1 ELSE NULL END`
            })
            .where(eq(courseSchedules.id, sId));

        createdRegistrations.push(newReg);
    }

    return createdRegistrations;
}

/**
 * Create Razorpay Order
 */
export const createRazorpayOrder = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { amount, scheduleId } = req.body;

    if (!amount || !scheduleId) {
        throw new AppError(400, 'Amount and schedule ID are required');
    }

    const numericScheduleId = typeof scheduleId === 'string' ? parseInt(scheduleId) : scheduleId;

    if (isNaN(numericScheduleId)) {
        throw new AppError(400, `Invalid schedule ID: ${scheduleId}. Expected a number.`);
    }

    // Validate schedule exists
    const scheduleResults = await db.select().from(courseSchedules).where(eq(courseSchedules.id, numericScheduleId)).limit(1);
    if (scheduleResults.length === 0) {
        throw new AppError(404, 'Course schedule not found');
    }

    const options = {
        amount: Math.round(amount * 100), // amount in paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}_${numericScheduleId} `,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.status(200).json(formatResponse(true, order, 'Razorpay order created successfully', 200));
    } catch (error: any) {
        console.error('Razorpay Order Error:', error);
        throw new AppError(500, `Razorpay error: ${error.description || error.message} `);
    }
});

/**
 * Verify Razorpay Payment and Create Registration(s)
 */
export const verifyRazorpayPayment = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        scheduleIds,
        amount,
        userData
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError(400, 'Payment verification details are required');
    }

    // Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", config.RAZORPAY.KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        throw new AppError(400, 'Invalid payment signature');
    }

    const userIdOrData = req.user ? req.user.id : userData;
    const registrations = await processSuccessfulRegistration(userIdOrData, scheduleIds, amount, razorpay_payment_id, 'RAZORPAY', req.user);

    res.status(200).json(formatResponse(true, registrations, 'Payment verified and registrations confirmed', 200));
});

/**
 * Create Stripe Payment Intent
 */
export const createStripePaymentIntent = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { amount, scheduleIds } = req.body;

    if (!amount || !scheduleIds) {
        throw new AppError(400, 'Amount and schedule IDs are required');
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // in cents/paise
            currency: 'inr',
            description: 'Course Enrollment',
            metadata: {
                scheduleIds: JSON.stringify(Array.isArray(scheduleIds) ? scheduleIds : [scheduleIds]),
                userId: req.user?.id?.toString() || 'guest'
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.status(200).json(formatResponse(true, {
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        }, 'Stripe Payment Intent created successfully', 200));
    } catch (err: any) {
        console.error('Stripe Intent Error:', err);
        throw new AppError(500, `Stripe error: ${err.message} `);
    }
});

/**
 * Verify Stripe Payment
 */
export const verifyStripePayment = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
        paymentIntentId,
        scheduleIds,
        amount,
        userData
    } = req.body;

    if (!paymentIntentId) {
        throw new AppError(400, 'Payment Intent ID is required');
    }

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            throw new AppError(400, `Payment not successful: ${paymentIntent.status} `);
        }

        const userIdOrData = req.user ? req.user.id : userData;
        const registrations = await processSuccessfulRegistration(userIdOrData, scheduleIds, amount, paymentIntentId, 'STRIPE', req.user);

        res.status(200).json(formatResponse(true, registrations, 'Stripe payment verified and registrations confirmed', 200));
    } catch (err: any) {
        console.error('Stripe Verification Error:', err);
        throw new AppError(500, `Stripe verification failed: ${err.message} `);
    }
});
