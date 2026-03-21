-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'participant' NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"service_type_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "service_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"schedule_id" integer NOT NULL,
	"registration_number" varchar(50) NOT NULL,
	"payment_id" varchar(255),
	"amount_paid" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'INR',
	"transaction_date" timestamp with time zone,
	"payment_status" varchar(50) DEFAULT 'PENDING',
	"status" varchar(50) DEFAULT 'PENDING',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "registrations_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE "course_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"mentor" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"batch_type" varchar(50),
	"course_type" varchar(50),
	"address" text,
	"language" varchar(50) DEFAULT 'English',
	"description" text,
	"difficulty_level" varchar(50) DEFAULT 'Intermediate',
	"duration" integer,
	"brochure_url" varchar(1024),
	"pricing" jsonb NOT NULL,
	"max_participants" integer,
	"capacity_remaining" integer,
	"enrollment_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_schedule_id_course_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_schedules" ADD CONSTRAINT "course_schedules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_schedules" ADD CONSTRAINT "course_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_courses_name" ON "courses" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_registrations_schedule_id" ON "registrations" USING btree ("schedule_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_registrations_user_id" ON "registrations" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_schedules_course_id" ON "course_schedules" USING btree ("course_id" int4_ops);--> statement-breakpoint
CREATE VIEW "public"."view_course_schedules" AS (SELECT cs.id AS schedule_id, c.id AS course_id, c.name AS course_name, st.id AS service_type_id, st.name AS service_type_name, cs.mentor, cs.start_date, cs.end_date, cs.start_time, cs.end_time, cs.batch_type, cs.course_type, cs.address, cs.language, cs.description, cs.difficulty_level, cs.duration, cs.brochure_url, cs.pricing, cs.max_participants, cs.capacity_remaining, cs.enrollment_count, cs.is_active, cs.created_at, cs.updated_at FROM course_schedules cs JOIN courses c ON cs.course_id = c.id LEFT JOIN service_types st ON c.service_type_id = st.id);
*/