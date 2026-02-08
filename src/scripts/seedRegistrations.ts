import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { Course, Participant, Registration } from '../models';

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

const generateMobile = () => {
    return '9' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
};

const generateDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const seedRegistrations = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');

        // 1. Find all active courses
        const courses = await Course.find({ isActive: true });
        if (courses.length === 0) {
            console.error('No active courses found. Please create a course first.');
            process.exit(1);
        }
        console.log(`Found ${courses.length} active courses.`);

        const registrationsToCreate = 30;
        const statuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
        const paymentModes = ['UPI', 'Card', 'NetBanking', 'Wallet'];

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

        for (let i = 1; i <= registrationsToCreate; i++) {
            // Pick random course
            const course = courses[Math.floor(Math.random() * courses.length)];

            const timestamp = Date.now();
            const statusIndex = Math.floor(Math.random() * statuses.length);
            const regStatus = statuses[statusIndex];

            // Logic: Confirmed/Completed -> Paid. Pending -> Pending. Cancelled -> Refunded or Pending.
            let payStatus = 'PENDING';
            if (regStatus === 'CONFIRMED' || regStatus === 'COMPLETED') payStatus = 'PAID';
            else if (regStatus === 'CANCELLED') payStatus = Math.random() > 0.5 ? 'REFUNDED' : 'PENDING';

            const participantName = generateName();
            const participantEmail = `${participantName.toLowerCase().replace(' ', '.')}.${timestamp}@example.com`;

            // 3. Create Participant
            const participant = await Participant.create({
                name: participantName,
                email: participantEmail,
                mobile: generateMobile(),
                status: 'ACTIVE',
                emailVerified: true,
                organization: Math.random() > 0.7 ? 'Tech Corp' : undefined,
                designation: Math.random() > 0.7 ? 'Developer' : undefined
            });

            const regDate = generateDate(startDate, new Date());
            // For completed courses, date should be older

            const amount = course.finalPrice || course.price;

            // 4. Create Registration
            const registration = await Registration.create({
                participantId: participant._id,
                courseId: course._id,
                originalPrice: course.price,
                finalAmount: amount,
                discountApplied: course.discountPercentage || 0,
                registrationStatus: regStatus,
                paymentStatus: payStatus,
                currency: 'INR',
                registrationNumber: `REG-${regDate.getTime().toString().slice(-8)}-${i}`,
                amountPaid: payStatus === 'PAID' ? amount : 0,
                transactionDate: payStatus === 'PAID' ? regDate : undefined,
                paymentMode: payStatus === 'PAID' ? paymentModes[Math.floor(Math.random() * paymentModes.length)] : undefined,
                paymentId: payStatus === 'PAID' ? `pay_${Math.random().toString(36).substring(7)}` : undefined,
                createdAt: regDate,
                updatedAt: regDate,
                attendacePercentage: regStatus === 'COMPLETED' ? 100 : 0
            });

            // 5. Update Participant Course List
            participant.registeredCourses.push({
                courseId: course._id as mongoose.Types.ObjectId,
                registrationId: registration._id as mongoose.Types.ObjectId,
                registrationDate: regDate
            });
            await participant.save();

            console.log(`[${i}/${registrationsToCreate}] Created ${regStatus} registration for ${participant.name} in ${course.courseName}`);
        }

        // Update enrollment counts
        for (const course of courses) {
            const count = await Registration.countDocuments({
                courseId: course._id,
                registrationStatus: { $in: ['CONFIRMED', 'COMPLETED', 'PENDING'] }
            });
            course.enrollmentCount = count;
            await course.save();
        }

        console.log('Seeding complete.');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedRegistrations();
