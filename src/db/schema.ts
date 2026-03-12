import {
    pgTable,
    serial,
    varchar,
    text,
    boolean,
    timestamp,
    date,
    time,
    decimal,
    integer,
    jsonb,
    index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Service Types Table
export const serviceTypes = pgTable('service_types', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2. Unified Users Table (Admin + Participants)
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('participant'), // admin, participant, super_admin
    status: varchar('status', { length: 50 }).default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    emailIdx: index('idx_users_email').on(t.email),
}));

// 3. Courses Table
export const courses = pgTable('courses', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    serviceTypeId: integer('service_type_id').references(() => serviceTypes.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    nameIdx: index('idx_courses_name').on(t.name),
}));

// 4. Course Schedules Table
export const courseSchedules = pgTable('course_schedules', {
    id: serial('id').primaryKey(),
    courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    mentor: varchar('mentor', { length: 255 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    startTime: time('start_time'),
    endTime: time('end_time'),
    batchType: varchar('batch_type', { length: 50 }),
    courseType: varchar('course_type', { length: 50 }),
    address: text('address'),
    language: varchar('language', { length: 50 }).default('English'),
    description: text('description'),
    difficultyLevel: varchar('difficulty_level', { length: 50 }).default('Intermediate'),
    duration: integer('duration'),
    brochureUrl: varchar('brochure_url', { length: 1024 }),

    // JSONB Pricing structure (Array of Objects)
    pricing: jsonb('pricing').notNull(),

    maxParticipants: integer('max_participants'),
    capacityRemaining: integer('capacity_remaining'),
    enrollmentCount: integer('enrollment_count').default(0),
    isActive: boolean('is_active').default(true),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    courseIdIdx: index('idx_schedules_course_id').on(t.courseId),
}));

// 5. Registrations Table
export const registrations = pgTable('registrations', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    scheduleId: integer('schedule_id').notNull().references(() => courseSchedules.id, { onDelete: 'cascade' }),
    registrationNumber: varchar('registration_number', { length: 50 }).notNull().unique(),
    paymentId: varchar('payment_id', { length: 255 }),
    amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 10 }).default('INR'),
    transactionDate: timestamp('transaction_date', { withTimezone: true }),
    paymentStatus: varchar('payment_status', { length: 50 }).default('PENDING'),
    status: varchar('status', { length: 50 }).default('PENDING'), // PENDING, CONFIRMED, CANCELLED
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    userIdIdx: index('idx_registrations_user_id').on(t.userId),
    scheduleIdIdx: index('idx_registrations_schedule_id').on(t.scheduleId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    schedulesCreated: many(courseSchedules),
    registrations: many(registrations),
}));

export const serviceTypesRelations = relations(serviceTypes, ({ many }) => ({
    courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
    serviceType: one(serviceTypes, {
        fields: [courses.serviceTypeId],
        references: [serviceTypes.id],
    }),
    schedules: many(courseSchedules),
}));

export const courseSchedulesRelations = relations(courseSchedules, ({ one, many }) => ({
    course: one(courses, {
        fields: [courseSchedules.courseId],
        references: [courses.id],
    }),
    creator: one(users, {
        fields: [courseSchedules.createdBy],
        references: [users.id],
    }),
    registrations: many(registrations),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
    user: one(users, {
        fields: [registrations.userId],
        references: [users.id],
    }),
    schedule: one(courseSchedules, {
        fields: [registrations.scheduleId],
        references: [courseSchedules.id],
    }),
}));
