import { sql } from 'drizzle-orm';
import { db, courseSchedules } from '../models';

type CourseRow = {
    id: number;
    name: string;
    service_type_name: string;
};

type MentorMappingRow = {
    course_id: number;
    mentor_id: number;
    mentor_name: string;
};

interface PriceBracket {
    inr: number;
    usd: number;
    cad: number;
    aud: number;
    sgd: number;
    eur: number;
    discountPct: number;
}

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const typePricing: Record<string, PriceBracket> = {
    'AGILE': { inr: 28000, usd: 550, cad: 700, aud: 780, sgd: 680, eur: 490, discountPct: 20 },
    'SAFE': { inr: 35000, usd: 700, cad: 890, aud: 990, sgd: 850, eur: 620, discountPct: 15 },
    'PROJECT': { inr: 32000, usd: 620, cad: 790, aud: 880, sgd: 760, eur: 570, discountPct: 18 },
    'BUSINESS': { inr: 22000, usd: 430, cad: 550, aud: 610, sgd: 530, eur: 390, discountPct: 22 },
    'Generative AI': { inr: 30000, usd: 590, cad: 750, aud: 840, sgd: 720, eur: 540, discountPct: 12 },
    'Microcredentials': { inr: 9900, usd: 199, cad: 249, aud: 279, sgd: 239, eur: 179, discountPct: 10 },
    'DEVOPS': { inr: 25000, usd: 490, cad: 625, aud: 699, sgd: 599, eur: 449, discountPct: 20 },
    'ON DEMAND MICROCREDENTIALS': { inr: 7900, usd: 149, cad: 189, aud: 209, sgd: 185, eur: 139, discountPct: 0 },
    'E-Learning': { inr: 12900, usd: 249, cad: 319, aud: 349, sgd: 299, eur: 229, discountPct: 10 },
    'Combo Courses': { inr: 38000, usd: 760, cad: 960, aud: 1060, sgd: 920, eur: 690, discountPct: 18 },
    'SERVICE': { inr: 19000, usd: 370, cad: 470, aud: 530, sgd: 455, eur: 340, discountPct: 15 },
    'QUALITY': { inr: 24000, usd: 470, cad: 595, aud: 660, sgd: 570, eur: 420, discountPct: 18 },
    'CLOUD COMPUTING': { inr: 27000, usd: 530, cad: 670, aud: 749, sgd: 645, eur: 479, discountPct: 20 },
    'DATA SCIENCE': { inr: 29000, usd: 570, cad: 720, aud: 799, sgd: 690, eur: 515, discountPct: 18 },
    'TECHNOLOGY': { inr: 20000, usd: 390, cad: 495, aud: 549, sgd: 475, eur: 349, discountPct: 22 },
    'OTHERS': { inr: 23000, usd: 450, cad: 570, aud: 635, sgd: 549, eur: 409, discountPct: 16 },
};

const jitter = (base: number) => Math.round(base * (0.90 + Math.random() * 0.20) / 100) * 100;

const buildPricing = (bracket: PriceBracket) => {
    const disc = bracket.discountPct;
    const make = (country: string, currency: string, base: number) => {
        const price = jitter(base);
        const finalPrice = Math.round(price * (1 - disc / 100) / 10) * 10;
        return { country, currency, price, discountPercentage: disc, finalPrice };
    };
    return [
        make('India', 'INR', bracket.inr),
        make('USA', 'USD', bracket.usd),
        make('Canada', 'CAD', bracket.cad),
        make('Australia', 'AUD', bracket.aud),
        make('Singapore', 'SGD', bracket.sgd),
        make('Europe', 'EUR', bracket.eur),
    ];
};

const timeSlots = [
    { start: '09:00', end: '13:00' },
    { start: '10:00', end: '14:00' },
    { start: '14:00', end: '18:00' },
    { start: '19:00', end: '23:00' },
    { start: '06:00', end: '10:00' },
];

const batchTypes = ['WEEKEND', 'WEEKDAY', 'FAST TRACK'];
const languages = ['English', 'English', 'English', 'Hindi'];

const scheduleCount = (course: CourseRow, idx: number): number => {
    if (course.service_type_name === 'Combo Courses') return 2;
    if (course.service_type_name === 'E-Learning') return idx % 2 === 0 ? 2 : 1;

    const r = idx % 9;
    if (r === 0) return 4;
    if (r <= 2) return 3;
    if (r <= 5) return 2;
    return 1;
};

const buildScheduleDescription = (course: CourseRow, mentorName: string) => {
    if (course.service_type_name === 'E-Learning') {
        return `${course.name} supported by ${mentorName} with a self-paced e-learning test schedule.`;
    }

    if (course.service_type_name === 'Combo Courses') {
        return `${course.name} guided by ${mentorName} with a bundled combo-course test schedule.`;
    }

    return `${course.name} led by ${mentorName} in a live instructor-led batch.`;
};

const addDays = (base: Date, days: number): Date =>
    new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

const dateStr = (d: Date) => d.toISOString().split('T')[0];

const seedSchedules = async () => {
    try {
        console.log('✓ Starting Course Schedule Seeding...');

        await db.execute(sql`TRUNCATE TABLE cart_items, registrations, course_schedules RESTART IDENTITY CASCADE`);
        console.log('✓ Cleared existing schedules and registrations');

        const allCourses = await db.execute<CourseRow>(sql`
            SELECT c.id, c.name, st.name AS service_type_name
            FROM courses c
            LEFT JOIN service_types st ON st.id = c.service_type_id
            ORDER BY c.id
        `);

        const mappedMentors = await db.execute<MentorMappingRow>(sql`
            SELECT mcm.course_id, m.id AS mentor_id, m.name AS mentor_name
            FROM mentor_course_mappings mcm
            INNER JOIN mentors m ON m.id = mcm.mentor_id
            WHERE m.is_active = true
            ORDER BY mcm.course_id, m.id
        `);

        const courseRows = allCourses.rows as CourseRow[];
        const mentorRows = mappedMentors.rows as MentorMappingRow[];

        if (courseRows.length === 0) {
            console.error('No courses found. Please run seedCourses first.');
            process.exit(1);
        }

        if (mentorRows.length === 0) {
            console.error('No mentor mappings found. Please run seedMentors first.');
            process.exit(1);
        }

        const mentorsByCourse = new Map<number, MentorMappingRow[]>();
        mentorRows.forEach((row) => {
            const existing = mentorsByCourse.get(row.course_id) || [];
            existing.push(row);
            mentorsByCourse.set(row.course_id, existing);
        });

        const coursesWithoutMentors = courseRows.filter((course) => !(mentorsByCourse.get(course.id) || []).length);
        if (coursesWithoutMentors.length > 0) {
            console.error(`Found ${coursesWithoutMentors.length} courses without mentor mappings. Please rerun seedMentors.`);
            process.exit(1);
        }

        console.log(`Found ${courseRows.length} courses with mentor mappings. Building schedules...`);

        const schedulesToInsert: Array<typeof courseSchedules.$inferInsert> = [];
        const now = new Date();
        const startOffsetPool = [7, 14, 21, 28, 35, 42, 56, 70, 90];

        courseRows.forEach((course, idx) => {
            const count = scheduleCount(course, idx);
            const bracket = typePricing[course.service_type_name] || typePricing['OTHERS'];
            const mentorPool = mentorsByCourse.get(course.id) || [];

            for (let s = 0; s < count; s += 1) {
                const baseOffset = startOffsetPool[idx % startOffsetPool.length] + s * (45 + Math.floor(Math.random() * 45));
                const startDate = addDays(now, baseOffset);
                const duration = s % 3 === 0 ? 4 : s % 3 === 1 ? 3 : 2;
                const endDate = addDays(startDate, duration);
                const slot = pick(timeSlots);
                const batchType = pick(batchTypes);
                const language = pick(languages);
                const pricing = buildPricing(bracket);
                const mentor = mentorPool[(idx + s) % mentorPool.length];
                const capacity = [20, 25, 30, 40, 50][idx % 5];
                const filled = Math.floor(Math.random() * capacity * 0.75);

                schedulesToInsert.push({
                    courseId: course.id,
                    mentorId: mentor.mentor_id,
                    startDate: dateStr(startDate),
                    endDate: dateStr(endDate),
                    startTime: slot.start,
                    endTime: slot.end,
                    pricing,
                    batchType,
                    courseType: 'ONLINE',
                    language,
                    planAvailable: s % 2 === 0,
                    isActive: true,
                    maxParticipants: capacity,
                    enrollmentCount: filled,
                    capacityRemaining: capacity - filled,
                    description: buildScheduleDescription(course, mentor.mentor_name),
                    duration,
                });
            }
        });

        console.log(`Total schedules to insert: ${schedulesToInsert.length}`);

        const chunkSize = 50;
        for (let i = 0; i < schedulesToInsert.length; i += chunkSize) {
            const chunk = schedulesToInsert.slice(i, i + chunkSize);
            await db.insert(courseSchedules).values(chunk);
            console.log(`  ↳ Inserted ${Math.min(i + chunkSize, schedulesToInsert.length)}/${schedulesToInsert.length}`);
        }

        const counts = courseRows.map((course, i) => scheduleCount(course, i));
        const total = counts.reduce((a, b) => a + b, 0);
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
        counts.forEach((countValue) => { (distribution as any)[countValue] += 1; });

        console.log('\n✅ Schedule seeding complete!');
        console.log(`   Courses: ${courseRows.length}`);
        console.log(`   Total schedules: ${total}`);
        console.log(`   Distribution → 4 schedules: ${distribution[4]}, 3: ${distribution[3]}, 2: ${distribution[2]}, 1: ${distribution[1]}`);
        console.log('   Mentors used: only mapped mentors from mentor_course_mappings');

        process.exit(0);
    } catch (error) {
        console.error('✗ Seed failed:', error);
        process.exit(1);
    }
};

seedSchedules();
