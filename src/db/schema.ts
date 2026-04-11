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
    index,
    pgView,
    uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

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
    mobile: varchar('mobile', { length: 20 }), // Unified field for contact number
    location: varchar('location', { length: 255 }),
    timezone: varchar('timezone', { length: 100 }),
    dob: date('dob'),
    country: varchar('country', { length: 100 }),
    state: varchar('state', { length: 100 }),
    gender: varchar('gender', { length: 50 }),
    linkedinUrl: varchar('linkedin_url', { length: 512 }),
    facebookUrl: varchar('facebook_url', { length: 512 }),
    twitterUrl: varchar('twitter_url', { length: 512 }),
    websiteUrl: varchar('website_url', { length: 512 }),
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

// 4. Enquiries Table
export const enquiries = pgTable('enquiries', {
    id: serial('id').primaryKey(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
    courseName: varchar('course_name', { length: 255 }),
    message: text('message'),
    enquiryType: varchar('enquiry_type', { length: 50 }).default('GENERAL'),
    status: varchar('status', { length: 50 }).default('NEW'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    contactedAt: timestamp('contacted_at', { withTimezone: true }),
    adminNotes: text('admin_notes'),
    education: varchar('education', { length: 255 }),
}, (t) => ({
    emailIdx: index('idx_enquiries_email').on(t.email),
    statusIdx: index('idx_enquiries_status').on(t.status),
}));

// 5. Mentors Table
export const mentors = pgTable('mentors', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    specialization: varchar('specialization', { length: 255 }).notNull(),
    designation: varchar('designation', { length: 255 }).notNull(),
    description: text('description'),
    rating: decimal('rating', { precision: 2, scale: 1 }).default('0.0'),
    yearsOfExperience: integer('years_of_experience').notNull().default(0),
    linkedinId: varchar('linkedin_id', { length: 255 }),
    photoUrl: varchar('photo_url', { length: 1024 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    nameIdx: index('idx_mentors_name').on(t.name),
    specializationIdx: index('idx_mentors_specialization').on(t.specialization),
}));

// 6. Mentor <-> Course Mapping Table
export const mentorCourseMappings = pgTable('mentor_course_mappings', {
    id: serial('id').primaryKey(),
    mentorId: integer('mentor_id').notNull().references(() => mentors.id, { onDelete: 'cascade' }),
    courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    mentorIdIdx: index('idx_mentor_course_mappings_mentor_id').on(t.mentorId),
    courseIdIdx: index('idx_mentor_course_mappings_course_id').on(t.courseId),
    mentorCourseUniqueIdx: uniqueIndex('idx_mentor_course_mappings_unique').on(t.mentorId, t.courseId),
}));

// 7. Webinars Table
export const webinars = pgTable('webinars', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    webinarDate: date('webinar_date').notNull(),
    posterUrl: varchar('poster_url', { length: 1024 }).notNull(),
    location: varchar('location', { length: 100 }).notNull(),
    primaryMentorId: integer('primary_mentor_id').notNull().references(() => mentors.id),
    secondaryMentorId: integer('secondary_mentor_id').references(() => mentors.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    webinarDateIdx: index('idx_webinars_webinar_date').on(t.webinarDate),
    locationIdx: index('idx_webinars_location').on(t.location),
    primaryMentorIdx: index('idx_webinars_primary_mentor_id').on(t.primaryMentorId),
}));

// 8. Course Schedules Table
export const courseSchedules = pgTable('course_schedules', {
    id: serial('id').primaryKey(),
    courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    mentorId: integer('mentor_id').notNull().references(() => mentors.id),
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
    planAvailable: boolean('plan_available').default(true),
    isActive: boolean('is_active').default(true),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    courseIdIdx: index('idx_schedules_course_id').on(t.courseId),
    mentorIdIdx: index('idx_schedules_mentor_id').on(t.mentorId),
}));

// 9. Registrations Table
export const registrations = pgTable('registrations', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    scheduleId: integer('schedule_id').notNull().references(() => courseSchedules.id, { onDelete: 'cascade' }),
    registrationNumber: varchar('registration_number', { length: 50 }).notNull().unique(),
    paymentId: varchar('payment_id', { length: 255 }),
    paymentGateway: varchar('payment_gateway', { length: 50 }), // razorpay, stripe
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

// 10. Cart Items Table
export const cartItems = pgTable('cart_items', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    scheduleId: integer('schedule_id').notNull().references(() => courseSchedules.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    userIdIdx: index('idx_cart_items_user_id').on(t.userId),
}));

// 9. Enquiries Table
export const enquiries = pgTable('enquiries', {
    id: serial('id').primaryKey(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    education: varchar('education', { length: 255 }),
    courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
    courseName: varchar('course_name', { length: 255 }), // Fallback for when courseId is not available
    message: text('message'),
    enquiryType: varchar('enquiry_type', { length: 50 }).default('GENERAL'), // CONSULTATION, CORPORATE, ADVISOR, etc.
    status: varchar('status', { length: 50 }).default('NEW'), // NEW, CONTACTED, CLOSED
    contactedAt: timestamp('contacted_at', { withTimezone: true }),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    emailIdx: index('idx_enquiries_email').on(t.email),
    statusIdx: index('idx_enquiries_status').on(t.status),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    schedulesCreated: many(courseSchedules),
    registrations: many(registrations),
    cartItems: many(cartItems),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
    course: one(courses, {
        fields: [enquiries.courseId],
        references: [courses.id],
    }),
}));

export const serviceTypesRelations = relations(serviceTypes, ({ many }) => ({
    courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
    serviceType: one(serviceTypes, {
        fields: [courses.serviceTypeId],
        references: [serviceTypes.id],
    }),
    enquiries: many(enquiries),
    schedules: many(courseSchedules),
    mentorMappings: many(mentorCourseMappings),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
    course: one(courses, {
        fields: [enquiries.courseId],
        references: [courses.id],
    }),
}));

export const mentorsRelations = relations(mentors, ({ many }) => ({
    courseMappings: many(mentorCourseMappings),
    schedules: many(courseSchedules),
}));

export const mentorCourseMappingsRelations = relations(mentorCourseMappings, ({ one }) => ({
    mentor: one(mentors, {
        fields: [mentorCourseMappings.mentorId],
        references: [mentors.id],
    }),
    course: one(courses, {
        fields: [mentorCourseMappings.courseId],
        references: [courses.id],
    }),
}));

export const courseSchedulesRelations = relations(courseSchedules, ({ one, many }) => ({
    course: one(courses, {
        fields: [courseSchedules.courseId],
        references: [courses.id],
    }),
    mentor: one(mentors, {
        fields: [courseSchedules.mentorId],
        references: [mentors.id],
    }),
    creator: one(users, {
        fields: [courseSchedules.createdBy],
        references: [users.id],
    }),
    registrations: many(registrations),
    cartItems: many(cartItems),
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

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
    user: one(users, {
        fields: [cartItems.userId],
        references: [users.id],
    }),
    schedule: one(courseSchedules, {
        fields: [cartItems.scheduleId],
        references: [courseSchedules.id],
    }),
}));

// 6. Course Schedules View
export const viewCourseSchedules = pgView('view_course_schedules', {
    scheduleId: integer('schedule_id'),
    courseId: integer('course_id'),
    courseName: varchar('course_name', { length: 255 }),
    serviceTypeId: integer('service_type_id'),
    serviceTypeName: varchar('service_type_name', { length: 100 }),
    mentor: varchar('mentor', { length: 255 }),
    mentorId: integer('mentor_id'),
    mentorPhotoUrl: varchar('mentor_photo_url', { length: 1024 }),
    mentorDesignation: varchar('mentor_designation', { length: 255 }),
    mentorSpecialization: varchar('mentor_specialization', { length: 255 }),
    mentorRating: decimal('mentor_rating', { precision: 2, scale: 1 }),
    mentorYearsOfExperience: integer('mentor_years_of_experience'),
    mentorLinkedinId: varchar('mentor_linkedin_id', { length: 255 }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    startTime: time('start_time'),
    endTime: time('end_time'),
    batchType: varchar('batch_type', { length: 50 }),
    courseType: varchar('course_type', { length: 50 }),
    address: text('address'),
    language: varchar('language', { length: 50 }),
    description: text('description'),
    difficultyLevel: varchar('difficulty_level', { length: 50 }),
    duration: integer('duration'),
    brochureUrl: varchar('brochure_url', { length: 1024 }),
    pricing: jsonb('pricing'),
    maxParticipants: integer('max_participants'),
    capacityRemaining: integer('capacity_remaining'),
    enrollment_count: integer('enrollment_count'),
    plan_available: boolean('plan_available'),
    is_active: boolean('is_active'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
}).as(sql`
    SELECT
        cs.id AS schedule_id,
        c.id AS course_id,
        c.name AS course_name,
        st.id AS service_type_id,
        st.name AS service_type_name,
        m.name AS mentor,
        m.id AS mentor_id,
        m.photo_url AS mentor_photo_url,
        m.designation AS mentor_designation,
        m.specialization AS mentor_specialization,
        m.rating AS mentor_rating,
        m.years_of_experience AS mentor_years_of_experience,
        m.linkedin_id AS mentor_linkedin_id,
        cs.start_date,
        cs.end_date,
        cs.start_time,
        cs.end_time,
        cs.batch_type,
        cs.course_type,
        cs.address,
        cs.language,
        cs.description,
        cs.difficulty_level,
        cs.duration,
        cs.brochure_url,
        cs.pricing,
        cs.max_participants,
        cs.capacity_remaining,
        cs.enrollment_count,
        cs.plan_available,
        cs.is_active,
        cs.created_at,
        cs.updated_at
    FROM course_schedules cs
    JOIN courses c ON cs.course_id = c.id
    JOIN mentors m ON cs.mentor_id = m.id
    LEFT JOIN service_types st ON c.service_type_id = st.id
`);
