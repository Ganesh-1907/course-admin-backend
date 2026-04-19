import crypto from 'crypto';
import { Response } from 'express';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import {
  cartItems,
  courseSchedules,
  courses,
  db,
  mentors,
  registrations,
  users,
} from '../../models';
import config from '../../config/env';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { CustomRequest } from '../../types/common';
import { sendPaymentConfirmationEmail } from '../../utils/emailService';
import { formatResponse, hashPassword } from '../../utils/helpers';

const razorpay = new Razorpay({
  key_id: config.RAZORPAY.KEY_ID!,
  key_secret: config.RAZORPAY.KEY_SECRET!,
});

const stripe = new Stripe(config.STRIPE.SECRET_KEY!);

type CheckoutUserData = {
  name: string;
  email: string;
  mobile?: string;
  city?: string;
  zipCode?: string;
};

type RegistrationRecord = typeof registrations.$inferSelect;

type PaymentProcessingResult = {
  registrations: RegistrationRecord[];
  registrationNumbers: string[];
  primaryRegistrationNumber: string | null;
  purchaserEmail: string;
  purchaserName: string;
  emailSent: boolean;
};

const getString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const toMetadataValue = (value: unknown, maxLength = 255) => getString(value).slice(0, maxLength);

const parseNumericIds = (value: unknown): number[] => {
  const rawValues = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : [];
  const numericIds = rawValues
    .map((item) => {
      if (typeof item === 'number') {
        return item;
      }

      if (typeof item === 'string' && item.trim()) {
        return Number.parseInt(item, 10);
      }

      return Number.NaN;
    })
    .filter((item) => Number.isInteger(item) && item > 0);

  return [...new Set(numericIds)];
};

const parseScheduleIdsFromString = (value: unknown): number[] => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return parseNumericIds(parsed);
  } catch (_error) {
    return parseNumericIds(value.split(','));
  }
};

const normalizeCheckoutUserData = (value: unknown): CheckoutUserData => {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const email = getString(raw.email).toLowerCase();
  const fallbackName = email.includes('@') ? email.split('@')[0] : 'Learner';

  return {
    name: getString(raw.name || raw.fullName) || fallbackName,
    email,
    mobile: getString(raw.mobile || raw.phone) || undefined,
    city: getString(raw.city) || undefined,
    zipCode: getString(raw.zipCode) || undefined,
  };
};

const mergeCheckoutUserData = (primary?: unknown, fallback?: unknown): CheckoutUserData => {
  const primaryData = normalizeCheckoutUserData(primary);
  const fallbackData = normalizeCheckoutUserData(fallback);

  return {
    name: primaryData.name || fallbackData.name || 'Learner',
    email: primaryData.email || fallbackData.email,
    mobile: primaryData.mobile || fallbackData.mobile,
    city: primaryData.city || fallbackData.city,
    zipCode: primaryData.zipCode || fallbackData.zipCode,
  };
};

const parseUserId = (value: unknown): number | undefined => {
  const parsed = Number.parseInt(getString(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const secureCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const generateRegistrationNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `REG${timestamp}${random}`;
};

const toMinorUnits = (amount: number) => Math.round(amount * 100);
const fromMinorUnits = (amount: number) => Number((amount / 100).toFixed(2));

const splitAmountAcrossSchedules = (totalAmount: number, scheduleCount: number) => {
  const totalMinorUnits = toMinorUnits(totalAmount);
  const baseAmount = Math.floor(totalMinorUnits / scheduleCount);
  const remainder = totalMinorUnits % scheduleCount;

  return Array.from({ length: scheduleCount }, (_item, index) =>
    fromMinorUnits(baseAmount + (index < remainder ? 1 : 0))
  );
};

const getRazorpayNotes = (scheduleIds: number[], req: CustomRequest, userData?: CheckoutUserData) => ({
  scheduleIds: JSON.stringify(scheduleIds),
  userId: req.user?.id ? String(req.user.id) : 'guest',
  userName: toMetadataValue(userData?.name),
  userEmail: toMetadataValue(userData?.email),
  userMobile: toMetadataValue(userData?.mobile),
  userCity: toMetadataValue(userData?.city),
});

const getStripeMetadata = (scheduleIds: number[], req: CustomRequest, userData?: CheckoutUserData) => ({
  scheduleIds: JSON.stringify(scheduleIds),
  userId: req.user?.id ? String(req.user.id) : 'guest',
  userName: toMetadataValue(userData?.name),
  userEmail: toMetadataValue(userData?.email),
  userMobile: toMetadataValue(userData?.mobile),
  userCity: toMetadataValue(userData?.city),
});

const ensureGuestCheckoutDetails = (req: CustomRequest, userData?: CheckoutUserData) => {
  if (req.user?.id) {
    return;
  }

  if (!userData?.email) {
    throw new AppError(400, 'Email is required to complete guest checkout');
  }
};

const resolveCheckoutUser = (
  req: CustomRequest,
  explicitUserData?: unknown,
  metadataUserData?: unknown,
  metadataUserId?: unknown,
) => {
  if (req.user?.id) {
    return req.user.id;
  }

  const parsedUserId = parseUserId(metadataUserId);
  if (parsedUserId) {
    return parsedUserId;
  }

  const mergedUserData = mergeCheckoutUserData(explicitUserData, metadataUserData);

  if (!mergedUserData.email) {
    throw new AppError(400, 'Customer email is required to confirm registration');
  }

  return mergedUserData;
};

const fetchValidSchedules = async (scheduleIds: number[]) => {
  if (scheduleIds.length === 0) {
    throw new AppError(400, 'At least one valid schedule ID is required');
  }

  const scheduleRows = await db
    .select({ id: courseSchedules.id, isActive: courseSchedules.isActive })
    .from(courseSchedules)
    .where(inArray(courseSchedules.id, scheduleIds));

  if (scheduleRows.length !== scheduleIds.length) {
    throw new AppError(404, 'One or more course schedules were not found');
  }

  const inactiveSchedule = scheduleRows.find((schedule) => schedule.isActive === false);
  if (inactiveSchedule) {
    throw new AppError(400, `Course schedule ${inactiveSchedule.id} is not active`);
  }
};

const fetchRegistrationEmailDetails = async (registrationIds: number[]) => {
  if (registrationIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      registrationId: registrations.id,
      registrationNumber: registrations.registrationNumber,
      amountPaid: registrations.amountPaid,
      courseName: courses.name,
      mentorName: mentors.name,
      startDate: courseSchedules.startDate,
      endDate: courseSchedules.endDate,
    })
    .from(registrations)
    .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .innerJoin(mentors, eq(courseSchedules.mentorId, mentors.id))
    .where(inArray(registrations.id, registrationIds));

  const rowsById = new Map(rows.map((row) => [row.registrationId, row]));
  return registrationIds
    .map((registrationId) => rowsById.get(registrationId))
    .filter((row): row is (typeof rows)[number] => Boolean(row));
};

async function processSuccessfulRegistration(
  userIdOrData: number | CheckoutUserData,
  scheduleIds: number[],
  amount: number,
  paymentId: string,
  paymentGateway: string,
  req?: CustomRequest,
  currency = 'INR',
): Promise<PaymentProcessingResult> {
  const normalizedScheduleIds = parseNumericIds(scheduleIds);

  if (normalizedScheduleIds.length === 0) {
    throw new AppError(400, 'At least one valid numeric schedule ID is required');
  }

  const existingSchedules = await db
    .select({ id: courseSchedules.id })
    .from(courseSchedules)
    .where(inArray(courseSchedules.id, normalizedScheduleIds));

  if (existingSchedules.length !== normalizedScheduleIds.length) {
    throw new AppError(404, 'One or more course schedules were not found');
  }

  let userId: number;
  let purchaserEmail = '';
  let purchaserName = 'Learner';

  if (typeof userIdOrData === 'number') {
    const existingUsers = await db.select().from(users).where(eq(users.id, userIdOrData)).limit(1);
    const existingUser = existingUsers[0];

    if (!existingUser) {
      throw new AppError(404, 'User not found for payment confirmation');
    }

    userId = existingUser.id;
    purchaserEmail = existingUser.email;
    purchaserName = existingUser.name;
  } else {
    const userData = normalizeCheckoutUserData(userIdOrData);

    if (!userData.email) {
      throw new AppError(400, 'Customer email is required to complete registration');
    }

    const existingUsers = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      userId = existingUser.id;
      purchaserEmail = existingUser.email;
      purchaserName = existingUser.name;

      const nextMobile = existingUser.mobile || userData.mobile;
      if (nextMobile && nextMobile !== existingUser.mobile) {
        await db
          .update(users)
          .set({ mobile: nextMobile, updatedAt: new Date() })
          .where(eq(users.id, existingUser.id));
      }
    } else {
      const temporaryPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await hashPassword(temporaryPassword);

      const [newUser] = await db
        .insert(users)
        .values({
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile,
          password: hashedPassword,
          role: 'participant',
        })
        .returning();

      userId = newUser.id;
      purchaserEmail = newUser.email;
      purchaserName = newUser.name;
    }
  }

  const createdRegistrations: RegistrationRecord[] = [];
  const newlyConfirmedRegistrationIds: number[] = [];
  const splitAmounts = splitAmountAcrossSchedules(amount, normalizedScheduleIds.length);

  for (const [index, scheduleId] of normalizedScheduleIds.entries()) {
    const paidRegistration = await db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.scheduleId, scheduleId),
          eq(registrations.paymentStatus, 'PAID'),
          ne(registrations.status, 'CANCELLED'),
        ),
      )
      .limit(1);

    if (paidRegistration.length > 0) {
      createdRegistrations.push(paidRegistration[0]);
      continue;
    }

    const pendingRegistration = await db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.scheduleId, scheduleId),
          ne(registrations.status, 'CANCELLED'),
        ),
      )
      .limit(1);

    const registrationAmount = splitAmounts[index];

    if (pendingRegistration.length > 0) {
      const [updatedRegistration] = await db
        .update(registrations)
        .set({
          paymentId,
          paymentGateway,
          amountPaid: registrationAmount.toFixed(2),
          currency,
          transactionDate: new Date(),
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          updatedAt: new Date(),
          notes: `Payment confirmed via ${paymentGateway.toUpperCase()}`,
        })
        .where(eq(registrations.id, pendingRegistration[0].id))
        .returning();

      createdRegistrations.push(updatedRegistration);
      newlyConfirmedRegistrationIds.push(updatedRegistration.id);
      continue;
    }

    const [newRegistration] = await db
      .insert(registrations)
      .values({
        userId,
        scheduleId,
        registrationNumber: generateRegistrationNumber(),
        paymentId,
        paymentGateway,
        amountPaid: registrationAmount.toFixed(2),
        currency,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        transactionDate: new Date(),
        notes: `Payment confirmed via ${paymentGateway.toUpperCase()}`,
      })
      .returning();

    await db
      .update(courseSchedules)
      .set({
        enrollmentCount: sql`${courseSchedules.enrollmentCount} + 1`,
        capacityRemaining: sql`CASE WHEN ${courseSchedules.capacityRemaining} IS NOT NULL THEN ${courseSchedules.capacityRemaining} - 1 ELSE NULL END`,
        updatedAt: new Date(),
      })
      .where(eq(courseSchedules.id, scheduleId));

    createdRegistrations.push(newRegistration);
    newlyConfirmedRegistrationIds.push(newRegistration.id);
  }

  if (typeof userIdOrData === 'number') {
    await db.delete(cartItems).where(eq(cartItems.userId, userIdOrData));
  }

  if (req?.session) {
    req.session.cart = [];
  }

  let emailSent = false;
  if (newlyConfirmedRegistrationIds.length > 0 && purchaserEmail) {
    try {
      const emailRegistrations = await fetchRegistrationEmailDetails(newlyConfirmedRegistrationIds);
      await sendPaymentConfirmationEmail({
        email: purchaserEmail,
        customerName: purchaserName,
        paymentGateway,
        paymentId,
        totalAmount: amount,
        currency,
        registrations: emailRegistrations.map((registration) => ({
          registrationNumber: registration.registrationNumber,
          courseName: registration.courseName,
          mentorName: registration.mentorName,
          startDate: registration.startDate,
          endDate: registration.endDate,
          amountPaid: registration.amountPaid,
        })),
      });
      emailSent = true;
    } catch (error) {
      console.error('Payment confirmation email failed:', error);
    }
  }

  return {
    registrations: createdRegistrations,
    registrationNumbers: createdRegistrations.map((registration) => registration.registrationNumber),
    primaryRegistrationNumber: createdRegistrations[0]?.registrationNumber ?? null,
    purchaserEmail,
    purchaserName,
    emailSent,
  };
}

export const createRazorpayOrder = asyncHandler(async (req: CustomRequest, res: Response) => {
  const amount = Number(req.body.amount);
  const scheduleIds = parseNumericIds(req.body.scheduleIds ?? req.body.scheduleId);
  const userData = normalizeCheckoutUserData(req.body.userData);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, 'A valid amount is required');
  }

  await fetchValidSchedules(scheduleIds);
  ensureGuestCheckoutDetails(req, userData);

  try {
    const order = await razorpay.orders.create({
      amount: toMinorUnits(amount),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: getRazorpayNotes(scheduleIds, req, userData),
    });

    res
      .status(200)
      .json(formatResponse(true, order, 'Razorpay order created successfully', 200));
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    throw new AppError(500, `Razorpay error: ${error.description || error.message}`);
  }
});

export const verifyRazorpayPayment = asyncHandler(async (req: CustomRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError(400, 'Payment verification details are required');
  }

  const signedPayload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.RAZORPAY.KEY_SECRET!)
    .update(signedPayload)
    .digest('hex');

  if (!secureCompare(expectedSignature, String(razorpay_signature))) {
    throw new AppError(400, 'Invalid payment signature');
  }

  try {
    const payment = (await razorpay.payments.fetch(String(razorpay_payment_id))) as any;
    const order = (await razorpay.orders.fetch(String(razorpay_order_id))) as any;

    if (payment.order_id !== razorpay_order_id) {
      throw new AppError(400, 'Payment does not belong to the provided order');
    }

    if (!['captured', 'authorized'].includes(payment.status)) {
      throw new AppError(400, `Payment not successful: ${payment.status}`);
    }

    const orderNotes = order.notes || {};
    const scheduleIdsFromOrder = parseScheduleIdsFromString(orderNotes.scheduleIds);
    const scheduleIds =
      scheduleIdsFromOrder.length > 0
        ? scheduleIdsFromOrder
        : parseNumericIds(req.body.scheduleIds ?? req.body.scheduleId);

    const result = await processSuccessfulRegistration(
      resolveCheckoutUser(
        req,
        req.body.userData,
        {
          name: orderNotes.userName,
          email: orderNotes.userEmail,
          mobile: orderNotes.userMobile,
          city: orderNotes.userCity,
        },
        orderNotes.userId,
      ),
      scheduleIds,
      fromMinorUnits(Number(payment.amount || order.amount || 0)),
      String(razorpay_payment_id),
      'RAZORPAY',
      req,
      String(payment.currency || order.currency || 'INR').toUpperCase(),
    );

    res.status(200).json(
      formatResponse(
        true,
        {
          ...result,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        },
        'Payment verified and registrations confirmed',
        200,
      ),
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error('Razorpay Verification Error:', error);
    throw new AppError(500, `Razorpay verification failed: ${error.message}`);
  }
});

export const createStripePaymentIntent = asyncHandler(async (req: CustomRequest, res: Response) => {
  const amount = Number(req.body.amount);
  const scheduleIds = parseNumericIds(req.body.scheduleIds ?? req.body.scheduleId);
  const userData = normalizeCheckoutUserData(req.body.userData);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, 'A valid amount is required');
  }

  await fetchValidSchedules(scheduleIds);
  ensureGuestCheckoutDetails(req, userData);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toMinorUnits(amount),
      currency: 'inr',
      description: 'Course Enrollment',
      metadata: getStripeMetadata(scheduleIds, req, userData),
      receipt_email: userData.email || undefined,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json(
      formatResponse(
        true,
        {
          clientSecret: paymentIntent.client_secret,
          id: paymentIntent.id,
        },
        'Stripe Payment Intent created successfully',
        200,
      ),
    );
  } catch (error: any) {
    console.error('Stripe Intent Error:', error);
    throw new AppError(500, `Stripe error: ${error.message}`);
  }
});

export const verifyStripePayment = asyncHandler(async (req: CustomRequest, res: Response) => {
  const paymentIntentId = getString(req.body.paymentIntentId);

  if (!paymentIntentId) {
    throw new AppError(400, 'Payment Intent ID is required');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError(400, `Payment not successful: ${paymentIntent.status}`);
    }

    const metadata = paymentIntent.metadata || {};
    const scheduleIdsFromMetadata = parseScheduleIdsFromString(metadata.scheduleIds);
    const scheduleIds =
      scheduleIdsFromMetadata.length > 0
        ? scheduleIdsFromMetadata
        : parseNumericIds(req.body.scheduleIds ?? req.body.scheduleId);

    const result = await processSuccessfulRegistration(
      resolveCheckoutUser(
        req,
        req.body.userData,
        {
          name: metadata.userName,
          email: metadata.userEmail,
          mobile: metadata.userMobile,
          city: metadata.userCity,
        },
        metadata.userId,
      ),
      scheduleIds,
      fromMinorUnits(Number(paymentIntent.amount_received || paymentIntent.amount || 0)),
      paymentIntent.id,
      'STRIPE',
      req,
      String(paymentIntent.currency || 'INR').toUpperCase(),
    );

    res.status(200).json(
      formatResponse(
        true,
        {
          ...result,
          paymentIntentId: paymentIntent.id,
        },
        'Stripe payment verified and registrations confirmed',
        200,
      ),
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error('Stripe Verification Error:', error);
    throw new AppError(500, `Stripe verification failed: ${error.message}`);
  }
});

export const handleStripeWebhook = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!config.STRIPE.WEBHOOK_SECRET) {
    throw new AppError(500, 'Stripe webhook secret is not configured');
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    throw new AppError(400, 'Missing Stripe signature header');
  }

  if (!Buffer.isBuffer(req.body)) {
    throw new AppError(400, 'Stripe webhook payload must be received as raw body');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, config.STRIPE.WEBHOOK_SECRET);
  } catch (error: any) {
    throw new AppError(400, `Invalid Stripe webhook signature: ${error.message}`);
  }

  if (event.type !== 'payment_intent.succeeded') {
    res.status(200).json({ received: true, ignored: event.type });
    return;
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const metadata = paymentIntent.metadata || {};
  const scheduleIds = parseScheduleIdsFromString(metadata.scheduleIds);

  await processSuccessfulRegistration(
    resolveCheckoutUser(
      req,
      undefined,
      {
        name: metadata.userName,
        email: metadata.userEmail,
        mobile: metadata.userMobile,
        city: metadata.userCity,
      },
      metadata.userId,
    ),
    scheduleIds,
    fromMinorUnits(Number(paymentIntent.amount_received || paymentIntent.amount || 0)),
    paymentIntent.id,
    'STRIPE',
    undefined,
    String(paymentIntent.currency || 'INR').toUpperCase(),
  );

  res.status(200).json({ received: true });
});

export const handleRazorpayWebhook = asyncHandler(async (req: CustomRequest, res: Response) => {
  if (!config.RAZORPAY.WEBHOOK_SECRET) {
    throw new AppError(500, 'Razorpay webhook secret is not configured');
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature || typeof signature !== 'string') {
    throw new AppError(400, 'Missing Razorpay signature header');
  }

  if (!Buffer.isBuffer(req.body)) {
    throw new AppError(400, 'Razorpay webhook payload must be received as raw body');
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.RAZORPAY.WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (!secureCompare(expectedSignature, signature)) {
    throw new AppError(400, 'Invalid Razorpay webhook signature');
  }

  const event = JSON.parse(req.body.toString('utf8')) as {
    event?: string;
    payload?: {
      payment?: { entity?: any };
    };
  };

  if (!['payment.captured', 'order.paid'].includes(event.event || '')) {
    res.status(200).json({ received: true, ignored: event.event });
    return;
  }

  const paymentEntity = event.payload?.payment?.entity;
  if (!paymentEntity?.id || !paymentEntity?.order_id) {
    throw new AppError(400, 'Invalid Razorpay webhook payload');
  }

  const order = (await razorpay.orders.fetch(String(paymentEntity.order_id))) as any;
  const notes = order.notes || {};
  const scheduleIds = parseScheduleIdsFromString(notes.scheduleIds);

  await processSuccessfulRegistration(
    resolveCheckoutUser(
      req,
      undefined,
      {
        name: notes.userName,
        email: notes.userEmail,
        mobile: notes.userMobile,
        city: notes.userCity,
      },
      notes.userId,
    ),
    scheduleIds,
    fromMinorUnits(Number(paymentEntity.amount || order.amount || 0)),
    String(paymentEntity.id),
    'RAZORPAY',
    undefined,
    String(paymentEntity.currency || order.currency || 'INR').toUpperCase(),
  );

  res.status(200).json({ received: true });
});
