import { db, courses, courseSchedules } from '../models';
import { sql } from 'drizzle-orm';

// ── Mentors ─────────────────────────────────────────────────────────────────
const mentorPool = [
    'Dr. Arpit Mehta', 'Prof. Sunita Rao', 'Dr. Vikram Sethi', 'Ananya Iyer', 'Rahul Deshmukh',
    'Saira Banu', 'Amitabh Joshi', 'Priyanka Sharma', 'Karthik Rajan', 'Deepa Narayanan',
    'Sudha Murthy', 'Shashi Tharoor', 'Kiran Mazumdar', 'Raghuram Rajan', 'Amartya Sen',
    'Satya Nadella', 'Sundar Pichai', 'Vinod Khosla', 'Azim Premji', 'Lakshmi Mittal',
    'Uday Kotak', 'Nandan Nilekani', 'Dilip Shanghvi', 'Cyrus Poonawalla', 'Ananth Narayanan',
    'Vijay Shekhar Sharma', 'Ritesh Agarwal', 'Byju Raveendran', 'Kunal Shah', 'Nithin Kamath'
];
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── Pricing by course type ─────────────────────────────────────────────────
/**
 * Each course type gets its own realistic price bracket.
 * Prices are in: India (INR), USA (USD), Canada (CAD), Australia (AUD), Singapore (SGD), Europe (EUR)
 * A small random ±10% jitter is applied later to make each schedule unique.
 */
interface PriceBracket {
    inr: number; usd: number; cad: number; aud: number; sgd: number; eur: number;
    discountPct: number; // percent off (applies to all currencies)
}

// Prices are the BASE (original) prices. finalPrice = price * (1 - discountPct/100)
const typePricing: Record<string, PriceBracket> = {
    'AGILE': { inr: 28000, usd: 550, cad: 700, aud: 780, sgd: 680, eur: 490, discountPct: 20 },
    'SAFE': { inr: 35000, usd: 700, cad: 890, aud: 990, sgd: 850, eur: 620, discountPct: 15 },
    'PROJECT': { inr: 32000, usd: 620, cad: 790, aud: 880, sgd: 760, eur: 570, discountPct: 18 },
    'BUSINESS': { inr: 22000, usd: 430, cad: 550, aud: 610, sgd: 530, eur: 390, discountPct: 22 },
    'Generative AI': { inr: 30000, usd: 590, cad: 750, aud: 840, sgd: 720, eur: 540, discountPct: 12 },
    'Microcredentials': { inr: 9900, usd: 199, cad: 249, aud: 279, sgd: 239, eur: 179, discountPct: 10 },
    'DEVOPS': { inr: 25000, usd: 490, cad: 625, aud: 699, sgd: 599, eur: 449, discountPct: 20 },
    'ON DEMAND MICROCREDENTIALS': { inr: 7900, usd: 149, cad: 189, aud: 209, sgd: 185, eur: 139, discountPct: 0 },
    'SERVICE': { inr: 19000, usd: 370, cad: 470, aud: 530, sgd: 455, eur: 340, discountPct: 15 },
    'QUALITY': { inr: 24000, usd: 470, cad: 595, aud: 660, sgd: 570, eur: 420, discountPct: 18 },
    'CLOUD COMPUTING': { inr: 27000, usd: 530, cad: 670, aud: 749, sgd: 645, eur: 479, discountPct: 20 },
    'DATA SCIENCE': { inr: 29000, usd: 570, cad: 720, aud: 799, sgd: 690, eur: 515, discountPct: 18 },
    'TECHNOLOGY': { inr: 20000, usd: 390, cad: 495, aud: 549, sgd: 475, eur: 349, discountPct: 22 },
    'OTHERS': { inr: 23000, usd: 450, cad: 570, aud: 635, sgd: 549, eur: 409, discountPct: 16 },
};

// ── Build pricing array ────────────────────────────────────────────────────
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

// ── Time slots ─────────────────────────────────────────────────────────────
const timeSlots = [
    { start: '09:00', end: '13:00' },  // Morning
    { start: '10:00', end: '14:00' },  // Morning-2
    { start: '14:00', end: '18:00' },  // Afternoon
    { start: '19:00', end: '23:00' },  // Evening
    { start: '06:00', end: '10:00' },  // Early morning
];
const batchTypes = ['WEEKEND', 'WEEKDAY', 'FAST TRACK'];
const languages = ['English', 'English', 'English', 'Hindi']; // Weighted: 3:1 English

// ── Schedule count distribution ───────────────────────────────────────────
// We'll cycle through [4, 3, 2, 1] in a pattern so we get a natural distribution
// Course index:  mod 8 → 0: 4 schedules, 1-2: 3, 3-5: 2, 6-7: 1
const scheduleCount = (idx: number): number => {
    const r = idx % 9;
    if (r === 0) return 4;
    if (r <= 2) return 3;
    if (r <= 5) return 2;
    return 1;
};

// ── Helper: add days ──────────────────────────────────────────────────────
const addDays = (base: Date, days: number): Date =>
    new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

const dateStr = (d: Date) => d.toISOString().split('T')[0];

// ── Course type map built from seedCourses data ──────────────────────────
// We'll look this up from DB service type join — instead we'll just map by
// order since serviceTypes were inserted in fixed order from seedCourses.
// The courseController.getCountryRegion already handles 6 regions correctly.

// ── Main Seed ─────────────────────────────────────────────────────────────
const seedSchedules = async () => {
    try {
        console.log('✓ Starting Course Schedule Seeding...');

        // Clear schedules & registrations
        await db.execute(sql`TRUNCATE TABLE registrations, course_schedules RESTART IDENTITY CASCADE`);
        console.log('✓ Cleared existing schedules and registrations');

        // Fetch all courses with their service type
        const allCourses = await db.execute<{ id: number; name: string; service_type_name: string }>(sql`
            SELECT c.id, c.name, st.name AS service_type_name
            FROM courses c
            LEFT JOIN service_types st ON st.id = c.service_type_id
            ORDER BY c.id
        `);

        const courseRows = allCourses.rows as { id: number; name: string; service_type_name: string }[];

        if (courseRows.length === 0) {
            console.error('No courses found. Please run seedCourses first.');
            process.exit(1);
        }

        console.log(`Found ${courseRows.length} courses. Building schedules...`);

        const schedulesToInsert: any[] = [];
        const now = new Date();
        // Start offset pool — spread first schedules across 7→90 days from now
        const startOffsetPool = [7, 14, 21, 28, 35, 42, 56, 70, 90];

        courseRows.forEach((course, idx) => {
            const count = scheduleCount(idx);
            const bracket = typePricing[course.service_type_name] || typePricing['OTHERS'];

            for (let s = 0; s < count; s++) {
                // Each schedule is spaced ~45-90 days apart from the previous one for the same course
                const baseOffset = startOffsetPool[idx % startOffsetPool.length] + s * (45 + Math.floor(Math.random() * 45));
                const startDate = addDays(now, baseOffset);
                // Duration: 2–5 days based on course type complexity
                const duration = s % 3 === 0 ? 4 : s % 3 === 1 ? 3 : 2;
                const endDate = addDays(startDate, duration);

                const slot = pick(timeSlots);
                const batchType = pick(batchTypes);
                const language = pick(languages);
                const pricing = buildPricing(bracket);
                const mentor = pick(mentorPool);
                const capacity = [20, 25, 30, 40, 50][idx % 5];
                const filled = Math.floor(Math.random() * capacity * 0.75);

                schedulesToInsert.push({
                    courseId: course.id,
                    mentor,
                    startDate: dateStr(startDate),
                    endDate: dateStr(endDate),
                    startTime: slot.start,
                    endTime: slot.end,
                    pricing,
                    batchType,
                    courseType: 'ONLINE',
                    language,
                    planAvailable: s % 2 === 0, // Alternate for testing
                    isActive: true,
                    maxParticipants: capacity,
                    enrollmentCount: filled,
                    capacityRemaining: capacity - filled,
                });
            }
        });

        console.log(`Total schedules to insert: ${schedulesToInsert.length}`);

        // Insert in chunks of 50
        const chunkSize = 50;
        for (let i = 0; i < schedulesToInsert.length; i += chunkSize) {
            const chunk = schedulesToInsert.slice(i, i + chunkSize);
            await db.insert(courseSchedules).values(chunk);
            console.log(`  ↳ Inserted ${Math.min(i + chunkSize, schedulesToInsert.length)}/${schedulesToInsert.length}`);
        }

        // Summary
        const counts = courseRows.map((_, i) => scheduleCount(i));
        const total = counts.reduce((a, b) => a + b, 0);
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
        counts.forEach(c => { (dist as any)[c]++; });
        console.log('\n✅ Seeding complete!');
        console.log(`   Courses: ${courseRows.length}`);
        console.log(`   Total schedules: ${total}`);
        console.log(`   Distribution → 4 schedules: ${dist[4]}, 3: ${dist[3]}, 2: ${dist[2]}, 1: ${dist[1]}`);
        console.log(`   Countries covered: India (INR), USA (USD), Canada (CAD), Australia (AUD), Singapore (SGD), Europe (EUR)`);

        process.exit(0);
    } catch (error) {
        console.error('✗ Seed failed:', error);
        process.exit(1);
    }
};

seedSchedules();
