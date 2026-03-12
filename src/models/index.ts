import { db } from '../db';
import * as schema from '../db/schema';

export const {
    users,
    serviceTypes,
    courses,
    courseSchedules,
    registrations,
} = schema;

export { db };
