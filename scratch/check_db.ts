import { db, courses, courseSchedules } from '../src/models';
import { eq, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkCourseSchedules() {
  try {
    console.log('Searching for course: Applying Professional Kanban (APK)');
    const allCourses = await db.select().from(courses);
    
    console.log('All courses in database:', allCourses.map(c => ({ id: c.id, name: c.name })));

    const apkCourse = allCourses.find(c => c.name.toLowerCase().includes('applying professional kanban') || c.name.toLowerCase().includes('apk'));
    
    if (apkCourse) {
      console.log('Found Course:', apkCourse.name, '(ID:', apkCourse.id, ')');
      const schedules = await db.select().from(courseSchedules).where(eq(courseSchedules.courseId, apkCourse.id));
      console.log('Schedules found count:', schedules.length);
      if (schedules.length > 0) {
        console.log('First schedule details:');
        const s = schedules[0];
        console.log(`- ID: ${s.id}`);
        console.log(`- Start Date: ${s.startDate}`);
        console.log(`- End Date: ${s.endDate}`);
        console.log(`- Batch Type: ${s.batchType}`);
        console.log(`- Price (INR): ${JSON.stringify(s.pricing)}`);
      }
    } else {
      console.log('Course not found in database.');
      console.log('Available courses:', allCourses.map(c => c.name));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCourseSchedules();
