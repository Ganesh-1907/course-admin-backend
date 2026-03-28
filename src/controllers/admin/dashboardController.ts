import { Response } from 'express';
import { CustomRequest } from '../../types/common';
import {
    db,
    registrations,
    courseSchedules,
    courses,
    users,
    serviceTypes
} from '../../models';
import {
    eq,
    and,
    ilike,
    sql,
    desc,
    count,
    sum
} from 'drizzle-orm';
import { formatResponse } from '../../utils/helpers';
import { asyncHandler } from '../../middleware/errorHandler';

/**
 * Get Dashboard Statistics
 */
export const getDashboardStats = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { type, startDate, endDate } = req.query;

    // Build conditions for registrations/revenue
    const regConditions = [];
    if (startDate) regConditions.push(sql`${registrations.createdAt} >= ${new Date(startDate as string)}`);
    if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        regConditions.push(sql`${registrations.createdAt} <= ${end}`);
    }

    if (type && type !== 'all' && type !== 'All Types') {
        regConditions.push(ilike(serviceTypes.name, `%${type}%`));
    }

    const regWhereClause = regConditions.length > 0 ? and(...regConditions) : undefined;

    // 1. Basic Stats (Courses)
    const totalCoursesRes = await db.select({ count: count() }).from(courses);
    const activeCoursesRes = await db.select({ count: count() }).from(courseSchedules).where(eq(courseSchedules.isActive, true));

    // 2. Registration Stats
    const totalRegsRes = await db.select({ count: count() })
        .from(registrations)
        .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
        .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
        .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
        .where(regWhereClause);

    const totalParticipantsRes = await db.select({ count: sql<number>`count(distinct ${registrations.userId})` })
        .from(registrations)
        .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
        .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
        .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
        .where(regWhereClause);

    const revenueRes = await db.select({ total: sum(registrations.amountPaid) })
        .from(registrations)
        .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
        .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
        .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
        .where(and(regWhereClause || sql`true`, eq(registrations.paymentStatus, 'PAID')));

    // 3. Courses By Type (Aggregation for Pie Chart)
    const coursesByType = await db.select({
        name: serviceTypes.name,
        value: count(courses.id)
    })
        .from(courses)
        .innerJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
        .groupBy(serviceTypes.name);

    // 4. Top Courses (by Registration Count)
    const topCourses = await db.select({
        id: courses.id,
        name: courses.name,
        count: count(registrations.id)
    })
        .from(registrations)
        .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
        .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
        .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
        .where(regWhereClause)
        .groupBy(courses.id, courses.name)
        .orderBy(desc(sql`count`))
        .limit(5);

    // 5. Registrations Over Time (Aggregation for Line Chart)
    // Group by month/year
    const monthExpr = sql<string>`to_char(${registrations.createdAt}, 'Mon YYYY')`;
    const sortKeyExpr = sql<string>`to_char(${registrations.createdAt}, 'YYYY-MM')`;

    const registrationsOverTime = await db.select({
        month: monthExpr,
        registrations: count(registrations.id),
        sortKey: sortKeyExpr
    })
        .from(registrations)
        .innerJoin(courseSchedules, eq(registrations.scheduleId, courseSchedules.id))
        .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
        .leftJoin(serviceTypes, eq(courses.serviceTypeId, serviceTypes.id))
        .where(regWhereClause)
        .groupBy(monthExpr, sortKeyExpr)
        .orderBy(sortKeyExpr)
        .limit(12);

    const stats = {
        courses: {
            total: Number(totalCoursesRes[0].count),
            active: Number(activeCoursesRes[0].count),
        },
        registrations: {
            total: Number(totalRegsRes[0].count),
        },
        participants: {
            total: Number(totalParticipantsRes[0].count) || 0,
        },
        payments: {
            totalRevenue: Number(revenueRes[0].total) || 0,
        },
        coursesByType,
        topCourses,
        registrationsOverTime
    };

    const response = formatResponse(true, stats, 'Dashboard statistics retrieved successfully', 200);
    res.status(200).json(response);
});
