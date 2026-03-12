import { db } from '../db';
import { sql } from 'drizzle-orm';

export const connectDB = async (): Promise<void> => {
  try {
    // Check if we can execute a simple query to verify connection
    await db.execute(sql`SELECT 1`);
    console.log(`✓ PostgreSQL Connected (via Drizzle)`);
  } catch (error) {
    console.error(`✗ PostgreSQL Connection Error:`, error);
    process.exit(1);
  }
};

export default connectDB;
