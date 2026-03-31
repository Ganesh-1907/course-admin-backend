import { sql } from 'drizzle-orm';
import { db, users, registrations, courseSchedules, courses, serviceTypes } from '../models';
import { hashPassword } from '../utils/helpers';

const seedAdmins = async () => {
  try {
    console.log('✓ Starting User/Admin Seeding...');

    // Delete only users and related data to avoid wiping unrelated tables
    await db.execute(sql`TRUNCATE TABLE registrations, users RESTART IDENTITY CASCADE`);

    console.log('✓ Cleared all existing data');

    // Create admin users
    const userList = [
      {
        name: 'Super Admin',
        email: 'superadmin@gmail.com',
        password: 'admin@123',
        role: 'super_admin',
        status: 'ACTIVE',
      },
      {
        name: 'Admin User',
        email: 'admin.user@gmail.com',
        password: 'admin@123',
        role: 'admin',
        status: 'ACTIVE',
      },
      {
        name: 'Participant User',
        email: 'user@gmail.com',
        password: 'user@123',
        role: 'participant',
        status: 'ACTIVE',
      },
    ];

    const usersToCreate = await Promise.all(
      userList.map(async (user) => {
        const hashedPassword = await hashPassword(user.password);
        return {
          ...user,
          password: hashedPassword,
        };
      })
    );

    const createdUsers = await db.insert(users).values(usersToCreate).returning();
    console.log(`✓ Created ${createdUsers.length} user(s):`);
    createdUsers.forEach((user) => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    console.log('✓ Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

seedAdmins();
