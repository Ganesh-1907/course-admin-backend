import { sql } from 'drizzle-orm';
import { db, mentors, mentorCourseMappings } from '../models';

type CourseRow = {
    id: number;
    name: string;
    service_type_name: string | null;
};

type MentorBlueprint = {
    specializations: string[];
    designationPrefix: string;
    descriptionFocus: string;
};

const firstNames = [
    'Aarav', 'Aditi', 'Akhil', 'Amrita', 'Ananya', 'Anirudh', 'Anjali', 'Arjun', 'Arpita', 'Ashwin',
    'Bhavna', 'Chaitanya', 'Charu', 'Deepak', 'Deepika', 'Divya', 'Farhan', 'Gauri', 'Harini', 'Ishaan',
    'Jhanvi', 'Kabir', 'Karthik', 'Kavya', 'Krishna', 'Lakshmi', 'Madhav', 'Meera', 'Mihir', 'Nandita',
    'Neha', 'Nikhil', 'Nisha', 'Pallavi', 'Pranav', 'Priya', 'Rahul', 'Rajesh', 'Rhea', 'Ritika',
    'Saanvi', 'Saket', 'Samarth', 'Sanjana', 'Shivani', 'Shravan', 'Sneha', 'Soham', 'Sonia', 'Sravya',
    'Tanya', 'Tarun', 'Tejas', 'Trisha', 'Uday', 'Vaibhav', 'Vaishnavi', 'Varun', 'Vidya', 'Vikram',
    'Vineeta', 'Vivek', 'Yash', 'Yogita', 'Zara', 'Abhinav', 'Bhargav', 'Dhruv', 'Eesha', 'Gokul',
    'Hemal', 'Ira', 'Jatin', 'Komal', 'Lalit', 'Manasi', 'Naveen', 'Omkar', 'Pooja', 'Raghav',
];

const lastNames = [
    'Agarwal', 'Bansal', 'Chakraborty', 'Desai', 'Dutta', 'Gupta', 'Iyer', 'Jain', 'Joshi', 'Kapoor',
    'Khanna', 'Kulkarni', 'Malhotra', 'Menon', 'Mehta', 'Mishra', 'Mukherjee', 'Nair', 'Patel', 'Rao',
    'Reddy', 'Saxena', 'Sen', 'Shah', 'Sharma', 'Singh', 'Srinivasan', 'Subramanian', 'Varma', 'Verma',
];

const mentorBlueprints: Record<string, MentorBlueprint> = {
    'AGILE': {
        specializations: ['Scrum Leadership', 'Product Ownership', 'Agile Coaching', 'Kanban Delivery', 'Enterprise Agility', 'Jira for Agile Teams'],
        designationPrefix: 'Agile',
        descriptionFocus: 'Agile delivery, facilitation, and team performance',
    },
    'SAFE': {
        specializations: ['SAFe Program Consulting', 'Release Train Engineering', 'Lean Portfolio Management', 'SAFe Product Leadership', 'SAFe DevOps'],
        designationPrefix: 'SAFe',
        descriptionFocus: 'scaled agile transformation and enterprise rollout',
    },
    'PROJECT': {
        specializations: ['PMP Preparation', 'Program Management', 'Portfolio Governance', 'Primavera Planning', 'PRINCE2 Delivery'],
        designationPrefix: 'Project',
        descriptionFocus: 'project governance, planning, and certification readiness',
    },
    'BUSINESS': {
        specializations: ['Business Analysis', 'Change Management', 'Conflict Resolution', 'Design Thinking', 'Stakeholder Communication'],
        designationPrefix: 'Business',
        descriptionFocus: 'business transformation, analysis, and leadership capability',
    },
    'Generative AI': {
        specializations: ['Prompt Engineering', 'AI Product Strategy', 'GenAI for Leaders', 'AI for Consultants', 'AI Architecture'],
        designationPrefix: 'Generative AI',
        descriptionFocus: 'applied AI adoption and business-centric implementation',
    },
    'Microcredentials': {
        specializations: ['Product Metrics', 'Scrum Essentials', 'Stakeholder Management', 'Agile Coaching Skills', 'AI for Scrum Masters'],
        designationPrefix: 'Microcredential',
        descriptionFocus: 'short-format learning programs with practical job-ready outcomes',
    },
    'DEVOPS': {
        specializations: ['DevOps Foundations', 'Docker and Kubernetes', 'DevSecOps Practices', 'Continuous Delivery'],
        designationPrefix: 'DevOps',
        descriptionFocus: 'automation, release management, and platform reliability',
    },
    'ON DEMAND MICROCREDENTIALS': {
        specializations: ['On-demand Agile Learning', 'Digital Product Skills', 'Self-paced DevOps Learning', 'Transformation Coaching'],
        designationPrefix: 'On-demand Learning',
        descriptionFocus: 'self-paced mentoring and outcome-driven digital learning journeys',
    },
    'SERVICE': {
        specializations: ['ITIL Foundations', 'Service Operations', 'Incident and Problem Management'],
        designationPrefix: 'Service Management',
        descriptionFocus: 'service operations excellence and ITSM best practices',
    },
    'QUALITY': {
        specializations: ['Six Sigma Foundations', 'Lean Process Improvement', 'Root Cause Analysis', 'Operational Excellence'],
        designationPrefix: 'Quality',
        descriptionFocus: 'quality improvement, process optimization, and analytics',
    },
    'CLOUD COMPUTING': {
        specializations: ['AWS Solutions Architecture', 'AWS SysOps', 'AWS DevOps', 'Cloud Foundations'],
        designationPrefix: 'Cloud',
        descriptionFocus: 'cloud infrastructure, architecture, and platform operations',
    },
    'DATA SCIENCE': {
        specializations: ['Python for Data Science', 'Applied Machine Learning', 'AI Foundations', 'Analytics Engineering'],
        designationPrefix: 'Data Science',
        descriptionFocus: 'data science capability building and AI application design',
    },
    'TECHNOLOGY': {
        specializations: ['React Development', 'React Native', 'Python Programming', 'Blockchain Fundamentals', 'Angular Development'],
        designationPrefix: 'Technology',
        descriptionFocus: 'hands-on engineering, application development, and technical delivery',
    },
    'OTHERS': {
        specializations: ['Power BI', 'Azure Administration', 'Cybersecurity Foundations', 'DevOps on Azure', 'Enterprise Architecture'],
        designationPrefix: 'Technology',
        descriptionFocus: 'enterprise technology enablement and specialist certification support',
    },
};

const slugify = (value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getBlueprint = (serviceTypeName: string | null): MentorBlueprint =>
    mentorBlueprints[serviceTypeName || ''] || mentorBlueprints['OTHERS'];

const getMentorCount = (courseCount: number) => Math.max(4, Math.min(8, Math.ceil(courseCount / 5)));

const seedMentors = async () => {
    try {
        console.log('✓ Starting Mentor Seeding...');

        const allCourses = await db.execute<CourseRow>(sql`
            SELECT c.id, c.name, st.name AS service_type_name
            FROM courses c
            LEFT JOIN service_types st ON st.id = c.service_type_id
            ORDER BY c.id
        `);

        const courseRows = allCourses.rows as CourseRow[];

        if (courseRows.length === 0) {
            console.error('No courses found. Please run seedCourses first.');
            process.exit(1);
        }

        await db.execute(sql`TRUNCATE TABLE cart_items, registrations, course_schedules, mentor_course_mappings, mentors RESTART IDENTITY CASCADE`);
        console.log('✓ Cleared existing mentors, mappings, and dependent schedules');

        const groupedCourses = new Map<string, CourseRow[]>();
        for (const course of courseRows) {
            const key = course.service_type_name || 'OTHERS';
            const existing = groupedCourses.get(key) || [];
            existing.push(course);
            groupedCourses.set(key, existing);
        }

        const mentorSeedRows: Array<typeof mentors.$inferInsert> = [];
        const mentorPlan: Array<{ serviceTypeName: string; tempKey: string }> = [];
        const usedNames = new Set<string>();
        let globalIndex = 0;

        for (const [serviceTypeName, serviceCourses] of groupedCourses.entries()) {
            const blueprint = getBlueprint(serviceTypeName);
            const mentorCount = getMentorCount(serviceCourses.length);

            for (let i = 0; i < mentorCount; i += 1) {
                let name = `${firstNames[globalIndex % firstNames.length]} ${lastNames[(globalIndex * 7) % lastNames.length]}`;
                while (usedNames.has(name)) {
                    globalIndex += 1;
                    name = `${firstNames[globalIndex % firstNames.length]} ${lastNames[(globalIndex * 7) % lastNames.length]}`;
                }
                usedNames.add(name);

                const specialization = blueprint.specializations[i % blueprint.specializations.length];
                const yearsOfExperience = 6 + (globalIndex % 14);
                const rating = (4.2 + (globalIndex % 8) * 0.1).toFixed(1);
                const linkedinId = slugify(name);

                mentorSeedRows.push({
                    name,
                    specialization,
                    designation: `${blueprint.designationPrefix} Mentor`,
                    description: `${name} specializes in ${specialization.toLowerCase()} and has ${yearsOfExperience}+ years of experience in ${blueprint.descriptionFocus}.`,
                    rating,
                    yearsOfExperience,
                    linkedinId,
                    photoUrl: `https://course-management-assets.s3.ap-south-1.amazonaws.com/mentors/${linkedinId}.jpg`,
                    isActive: true,
                });

                mentorPlan.push({
                    serviceTypeName,
                    tempKey: `${serviceTypeName}-${i}`,
                });

                globalIndex += 1;
            }
        }

        const insertedMentors = await db.insert(mentors).values(mentorSeedRows).returning();
        console.log(`✓ Seeded ${insertedMentors.length} mentors`);

        const mentorsByServiceType = new Map<string, typeof insertedMentors>();
        mentorPlan.forEach((plan, index) => {
            const currentList = mentorsByServiceType.get(plan.serviceTypeName) || [];
            currentList.push(insertedMentors[index]);
            mentorsByServiceType.set(plan.serviceTypeName, currentList);
        });

        const mappingRows: Array<typeof mentorCourseMappings.$inferInsert> = [];
        const mappingKeys = new Set<string>();

        for (const [serviceTypeName, serviceCourses] of groupedCourses.entries()) {
            const mentorPool = mentorsByServiceType.get(serviceTypeName) || [];
            const mentorSlotsPerCourse = Math.min(3, mentorPool.length);

            serviceCourses.forEach((course, courseIndex) => {
                for (let offset = 0; offset < mentorSlotsPerCourse; offset += 1) {
                    const mentor = mentorPool[(courseIndex + offset) % mentorPool.length];
                    const mappingKey = `${mentor.id}-${course.id}`;
                    if (!mappingKeys.has(mappingKey)) {
                        mappingRows.push({
                            mentorId: mentor.id,
                            courseId: course.id,
                        });
                        mappingKeys.add(mappingKey);
                    }
                }

                if (mentorPool.length > 3 && courseIndex % 4 === 0) {
                    const extraMentor = mentorPool[(courseIndex + 3) % mentorPool.length];
                    const extraKey = `${extraMentor.id}-${course.id}`;
                    if (!mappingKeys.has(extraKey)) {
                        mappingRows.push({
                            mentorId: extraMentor.id,
                            courseId: course.id,
                        });
                        mappingKeys.add(extraKey);
                    }
                }
            });
        }

        await db.insert(mentorCourseMappings).values(mappingRows);
        console.log(`✓ Created ${mappingRows.length} mentor-course mappings`);

        console.log('\n✅ Mentor seeding complete!');
        console.log(`   Courses covered: ${courseRows.length}`);
        console.log(`   Mentors created: ${insertedMentors.length}`);
        console.log(`   Course mappings: ${mappingRows.length}`);

        process.exit(0);
    } catch (error) {
        console.error('✗ Mentor seeding failed:', error);
        process.exit(1);
    }
};

seedMentors();
