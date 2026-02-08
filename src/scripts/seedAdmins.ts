import mongoose from 'mongoose';
import { Admin } from '../models';
import { hashPassword } from '../utils/helpers';
import config from '../config/env';

const seedAdmins = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    } as any);

    console.log('✓ Connected to MongoDB');

    // Delete existing admins to reseed
    await Admin.deleteMany({});
    console.log('✓ Cleared existing admins');

    // Create admin users with correct schema
    const adminUsers = [
      {
        name: 'admin.user',
        email: 'admin.user@gmail.com',
        password: 'admin@123',
        phone: '+91-9999999999',
        department: 'Management',
        role: 'admin',
        isActive: true,
      },
      {
        name: 'Admin Two',
        email: 'admin.two@gmail.com',
        password: 'admin@123',
        phone: '+91-8888888888',
        department: 'Operations',
        role: 'admin',
        isActive: true,
      },
    ];

    const adminsToCreate = await Promise.all(
      adminUsers.map(async (admin) => {
        const hashedPassword = await hashPassword(admin.password);
        return {
          ...admin,
          password: hashedPassword,
        };
      })
    );

    const createdAdmins = await Admin.insertMany(adminsToCreate);
    console.log(`✓ Created ${createdAdmins.length} admin user(s):`);
    createdAdmins.forEach((admin) => {
      console.log(`  - ${admin.email} (${admin.name})`);
    });

    await mongoose.connection.close();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('✗ Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

seedAdmins();
