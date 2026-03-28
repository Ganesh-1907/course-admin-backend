import { relations } from "drizzle-orm/relations";
import { serviceTypes, courses, users, registrations, courseSchedules } from "./schema";

export const coursesRelations = relations(courses, ({one, many}) => ({
	serviceType: one(serviceTypes, {
		fields: [courses.serviceTypeId],
		references: [serviceTypes.id]
	}),
	courseSchedules: many(courseSchedules),
}));

export const serviceTypesRelations = relations(serviceTypes, ({many}) => ({
	courses: many(courses),
}));

export const registrationsRelations = relations(registrations, ({one}) => ({
	user: one(users, {
		fields: [registrations.userId],
		references: [users.id]
	}),
	courseSchedule: one(courseSchedules, {
		fields: [registrations.scheduleId],
		references: [courseSchedules.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	registrations: many(registrations),
	courseSchedules: many(courseSchedules),
}));

export const courseSchedulesRelations = relations(courseSchedules, ({one, many}) => ({
	registrations: many(registrations),
	course: one(courses, {
		fields: [courseSchedules.courseId],
		references: [courses.id]
	}),
	user: one(users, {
		fields: [courseSchedules.createdBy],
		references: [users.id]
	}),
}));