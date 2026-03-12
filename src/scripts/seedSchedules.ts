import { db, courses, courseSchedules } from '../models';
import { sql } from 'drizzle-orm';

const mentorNames = [
    'Dr. Arpit Mehta', 'Prof. Sunita Rao', 'Dr. Vikram Sethi', 'Ananya Iyer', 'Rahul Deshmukh',
    'Saira Banu', 'Amitabh Joshi', 'Priyanka Chopra', 'Narendra Modi', 'Ratan Tata',
    'Sudha Murthy', 'Shashi Tharoor', 'Kiran Mazumdar-Shaw', 'Raghuram Rajan', 'Amartya Sen',
    'A.P.J. Abdul Kalam', 'Satya Nadella', 'Sundar Pichai', 'Indra Nooyi', 'Vinod Khosla',
    'Azim Premji', 'Mukesh Ambani', 'Lakshmi Mittal', 'N.R. Narayana Murthy', 'Shiv Nadar',
    'Uday Kotak', 'Kumar Mangalam Birla', 'Gautam Adani', 'Dilip Shanghvi', 'Cyrus Poonawalla'
];

const getRandomMentor = () => mentorNames[Math.floor(Math.random() * mentorNames.length)];

const seedSchedules = async () => {
    try {
        console.log('✓ Starting Course Schedule Seeding...');

        // Clear existing schedules and registrations
        await db.execute(sql`TRUNCATE TABLE registrations, course_schedules RESTART IDENTITY CASCADE`);
        console.log('✓ Cleared existing schedules and registrations');

        const allCourses = await db.select().from(courses);

        if (allCourses.length === 0) {
            console.error('No courses found. Please run seedCourses first.');
            process.exit(1);
        }

        console.log(`Found ${allCourses.length} courses. Creating 2 schedules for each...`);

        const schedulesToInsert = [];
        const now = new Date();

        for (const course of allCourses) {
            // Schedule 1: Next 2 months
            const start1 = new Date(now.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000);
            const end1 = new Date(start1.getTime() + (2 + Math.random() * 5) * 24 * 60 * 60 * 1000);

            schedulesToInsert.push({
                courseId: course.id,
                mentor: getRandomMentor(),
                startDate: start1.toISOString().split('T')[0],
                endDate: end1.toISOString().split('T')[0],
                pricing: [
                    { country: 'India', price: 5000, currency: 'INR', discountPercentage: 10, finalPrice: 4500 },
                    { country: 'USA', price: 500, currency: 'USD', discountPercentage: 10, finalPrice: 450 },
                    { country: 'Canada', price: 600, currency: 'CAD', discountPercentage: 10, finalPrice: 540 }
                ],
                batchType: 'WEEKEND',
                courseType: 'ONLINE',
                isActive: true,
                maxParticipants: 50,
                capacityRemaining: 50,
            });

            // Schedule 2: 2-4 months from now
            const start2 = new Date(now.getTime() + (60 + Math.random() * 60) * 24 * 60 * 60 * 1000);
            const end2 = new Date(start2.getTime() + (2 + Math.random() * 5) * 24 * 60 * 60 * 1000);

            schedulesToInsert.push({
                courseId: course.id,
                mentor: getRandomMentor(),
                startDate: start2.toISOString().split('T')[0],
                endDate: end2.toISOString().split('T')[0],
                pricing: [
                    { country: 'India', price: 5000, currency: 'INR', discountPercentage: 10, finalPrice: 4500 },
                    { country: 'USA', price: 500, currency: 'USD', discountPercentage: 10, finalPrice: 450 },
                    { country: 'Canada', price: 600, currency: 'CAD', discountPercentage: 10, finalPrice: 540 }
                ],
                batchType: 'WEEKEND',
                courseType: 'ONLINE',
                isActive: true,
                maxParticipants: 50,
                capacityRemaining: 50,
            });
        }

        const chunkSize = 50;
        for (let i = 0; i < schedulesToInsert.length; i += chunkSize) {
            const chunk = schedulesToInsert.slice(i, i + chunkSize);
            await db.insert(courseSchedules).values(chunk);
            console.log(`  - Seeded ${i + chunk.length}/${schedulesToInsert.length} schedules`);
        }

        console.log('✓ Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('✗ Seed failed:', error);
        process.exit(1);
    }
};

seedSchedules();
