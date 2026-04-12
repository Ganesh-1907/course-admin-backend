import { db } from '../db';
import * as schema from '../db/schema';

export const {
    users,
    serviceTypes,
    courses,
    enquiries,
    mentors,
    mentorCourseMappings,
    webinars,
    courseSchedules,
    registrations,
    cartItems,
    viewCourseSchedules,
    careers,
    jobApplications,
} = schema;

export { db };
