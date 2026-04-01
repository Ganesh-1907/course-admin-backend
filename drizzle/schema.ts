import { pgTable, index, foreignKey, serial, varchar, integer, timestamp, unique, date, numeric, text, time, jsonb, boolean, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const courses = pgTable("courses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	serviceTypeId: integer("service_type_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_courses_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.serviceTypeId],
			foreignColumns: [serviceTypes.id],
			name: "courses_service_type_id_service_types_id_fk"
		}).onDelete("set null"),
]);

export const serviceTypes = pgTable("service_types", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("service_types_name_unique").on(table.name),
]);

export const cartItems = pgTable("cart_items", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	scheduleId: integer("schedule_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_cart_items_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "cart_items_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [courseSchedules.id],
			name: "cart_items_schedule_id_course_schedules_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }).default('participant').notNull(),
	status: varchar({ length: 50 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	mobile: varchar({ length: 20 }),
	location: varchar({ length: 255 }),
	timezone: varchar({ length: 100 }),
	dob: date(),
	country: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	gender: varchar({ length: 50 }),
	linkedinUrl: varchar("linkedin_url", { length: 512 }),
	facebookUrl: varchar("facebook_url", { length: 512 }),
	twitterUrl: varchar("twitter_url", { length: 512 }),
	websiteUrl: varchar("website_url", { length: 512 }),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
]);

export const registrations = pgTable("registrations", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	scheduleId: integer("schedule_id").notNull(),
	registrationNumber: varchar("registration_number", { length: 50 }).notNull(),
	paymentId: varchar("payment_id", { length: 255 }),
	amountPaid: numeric("amount_paid", { precision: 12, scale:  2 }),
	currency: varchar({ length: 10 }).default('INR'),
	transactionDate: timestamp("transaction_date", { withTimezone: true, mode: 'string' }),
	paymentStatus: varchar("payment_status", { length: 50 }).default('PENDING'),
	status: varchar({ length: 50 }).default('PENDING'),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	paymentGateway: varchar("payment_gateway", { length: 50 }),
}, (table) => [
	index("idx_registrations_schedule_id").using("btree", table.scheduleId.asc().nullsLast().op("int4_ops")),
	index("idx_registrations_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "registrations_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.scheduleId],
			foreignColumns: [courseSchedules.id],
			name: "registrations_schedule_id_course_schedules_id_fk"
		}).onDelete("cascade"),
	unique("registrations_registration_number_unique").on(table.registrationNumber),
]);

export const courseSchedules = pgTable("course_schedules", {
	id: serial().primaryKey().notNull(),
	courseId: integer("course_id").notNull(),
	mentor: varchar({ length: 255 }).notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	startTime: time("start_time"),
	endTime: time("end_time"),
	batchType: varchar("batch_type", { length: 50 }),
	courseType: varchar("course_type", { length: 50 }),
	address: text(),
	language: varchar({ length: 50 }).default('English'),
	description: text(),
	difficultyLevel: varchar("difficulty_level", { length: 50 }).default('Intermediate'),
	duration: integer(),
	brochureUrl: varchar("brochure_url", { length: 1024 }),
	pricing: jsonb().notNull(),
	maxParticipants: integer("max_participants"),
	capacityRemaining: integer("capacity_remaining"),
	enrollmentCount: integer("enrollment_count").default(0),
	isActive: boolean("is_active").default(true),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	planAvailable: boolean("plan_available").default(true),
}, (table) => [
	index("idx_schedules_course_id").using("btree", table.courseId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "course_schedules_course_id_courses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "course_schedules_created_by_users_id_fk"
		}),
]);
export const viewCourseSchedules = pgView("view_course_schedules", {	scheduleId: integer("schedule_id"),
	courseId: integer("course_id"),
	courseName: varchar("course_name", { length: 255 }),
	serviceTypeId: integer("service_type_id"),
	serviceTypeName: varchar("service_type_name", { length: 100 }),
	mentor: varchar({ length: 255 }),
	startDate: date("start_date"),
	endDate: date("end_date"),
	startTime: time("start_time"),
	endTime: time("end_time"),
	batchType: varchar("batch_type", { length: 50 }),
	courseType: varchar("course_type", { length: 50 }),
	address: text(),
	language: varchar({ length: 50 }),
	description: text(),
	difficultyLevel: varchar("difficulty_level", { length: 50 }),
	duration: integer(),
	brochureUrl: varchar("brochure_url", { length: 1024 }),
	pricing: jsonb(),
	maxParticipants: integer("max_participants"),
	capacityRemaining: integer("capacity_remaining"),
	enrollmentCount: integer("enrollment_count"),
	isActive: boolean("is_active"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT cs.id AS schedule_id, c.id AS course_id, c.name AS course_name, st.id AS service_type_id, st.name AS service_type_name, cs.mentor, cs.start_date, cs.end_date, cs.start_time, cs.end_time, cs.batch_type, cs.course_type, cs.address, cs.language, cs.description, cs.difficulty_level, cs.duration, cs.brochure_url, cs.pricing, cs.max_participants, cs.capacity_remaining, cs.enrollment_count, cs.is_active, cs.created_at, cs.updated_at FROM course_schedules cs JOIN courses c ON cs.course_id = c.id LEFT JOIN service_types st ON c.service_type_id = st.id`);