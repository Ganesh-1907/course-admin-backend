import { db, courseSchedules, courses, users, registrations } from '../models';
import { eq, inArray, and, count } from 'drizzle-orm';

// Realistic Indian Names
const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Pari', 'Anika', 'Navya', 'Myra', 'Riya', 'Ira',
    'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Neha', 'Rohan', 'Pooja', 'Suresh', 'Kavita'
];
const lastNames = [
    'Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Das', 'Gupta', 'Rao', 'Nair', 'Reddy',
    'Mehta', 'Jain', 'Agarwal', 'Chopra', 'Malhotra', 'Saxena', 'Iyer', 'Menon', 'Joshi', 'Mishra'
];

const generateName = () => {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${first} ${last}`;
};

const generateDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const seedRegistrations = async () => {
    try {
        console.log('✓ Starting Registration Seeding...');

        // 1. Find all active schedules
        const schedules = await db.select()
            .from(courseSchedules)
            .where(eq(courseSchedules.isActive, true));

        if (schedules.length === 0) {
            console.error('No active courses found. Please create a course first.');
            process.exit(1);
        }
        console.log(`Found ${schedules.length} active course schedules.`);

        const registrationsToCreate = 30;
        const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

        for (let i = 1; i <= registrationsToCreate; i++) {
            // Pick random schedule
            const schedule = schedules[Math.floor(Math.random() * schedules.length)];

            const timestamp = Date.now();
            const statusIndex = Math.floor(Math.random() * statuses.length);
            const regStatus = statuses[statusIndex];

            // Logic: Confirmed -> Paid. Pending -> Pending. Cancelled -> Refunded or Pending.
            let payStatus = 'PENDING';
            if (regStatus === 'CONFIRMED') payStatus = 'PAID';
            else if (regStatus === 'CANCELLED') payStatus = Math.random() > 0.5 ? 'REFUNDED' : 'PENDING';

            const participantName = generateName();
            const participantEmail = `${participantName.toLowerCase().replace(' ', '.')}.${timestamp}.${i}@example.com`;

            // 3. Create User (Participant)
            const [user] = await db.insert(users).values({
                name: participantName,
                email: participantEmail,
                password: 'password123',
                role: 'participant',
                status: 'ACTIVE',
            }).returning();

            const regDate = generateDate(startDate, new Date());

            // Pick a random pricing from the schedule
            const pricingList = schedule.pricing as any[];
            const selectedPricing = pricingList[Math.floor(Math.random() * pricingList.length)];
            const amount = selectedPricing.finalPrice || selectedPricing.price;
            const currency = selectedPricing.currency;

            // 4. Create Registration
            const [registration] = await db.insert(registrations).values({
                userId: user.id,
                scheduleId: schedule.id,
                status: regStatus,
                paymentStatus: payStatus,
                currency: currency,
                registrationNumber: `REG-${regDate.getTime().toString().slice(-8)}-${i}`,
                amountPaid: payStatus === 'PAID' ? amount.toString() : '0',
                transactionDate: payStatus === 'PAID' ? regDate : undefined,
                paymentId: payStatus === 'PAID' ? `pay_${Math.random().toString(36).substring(7)}` : undefined,
                createdAt: regDate,
                updatedAt: regDate,
            }).returning();

            console.log(`[${i}/${registrationsToCreate}] Created ${regStatus} registration for ${user.name}`);
        }

        // Update enrollment counts
        console.log('✓ Updating enrollment counts...');
        for (const schedule of schedules) {
            const result = await db.select({ count: count() })
                .from(registrations)
                .where(and(
                    eq(registrations.scheduleId, schedule.id),
                    inArray(registrations.status, ['CONFIRMED', 'PENDING'])
                ));

            const enrollmentCount = Number(result[0].count);
            await db.update(courseSchedules)
                .set({ enrollmentCount })
                .where(eq(courseSchedules.id, schedule.id));
        }

        console.log('✓ Seeding complete.');
        process.exit(0);

    } catch (error) {
        console.error('✗ Seeding failed:', error);
        process.exit(1);
    }
};

seedRegistrations();
