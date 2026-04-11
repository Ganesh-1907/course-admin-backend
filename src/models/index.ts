import { db } from '../db';
import * as schema from '../db/schema';

export const {
    users,
    serviceTypes,
    courses,
    mentors,
    mentorCourseMappings,
    courseSchedules,
    registrations,
    cartItems,
    enquiries,
    viewCourseSchedules,
} = schema;

export { db };
