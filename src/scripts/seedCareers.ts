import { db } from '../db';
import { careers } from '../db/schema';

const seedCareers = async () => {
    console.log('--- Starting Career Seeding ---');
    
    const sampleCareers = [
        {
            title: 'Senior Agile Trainer & Coach',
            department: 'Training & Delivery',
            location: 'Remote',
            type: 'Full-time',
            description: 'Lead world-class Agile transformation workshops and mentor professional teams. We are looking for someone who lives and breathes Agile values.',
            requirements: '10+ years of experience in Agile/Scrum. Valid CSM, PSM, or SAFe SPC certifications. Proven track record of corporate training.',
            responsibilities: 'Conduct certification training (CSM/CSPO), develop advanced coaching modules, and support enterprise transformations.',
            salaryRange: '₹18L - ₹30L per annum',
            status: 'OPEN',
            isFeatured: true,
        },
        {
            title: 'Cloud & DevOps Solutions Architect',
            department: 'Technical Training',
            location: 'Bangalore / Remote',
            type: 'Full-time',
            description: 'Design and deliver comprehensive Cloud and DevOps training programs. Help our students master AWS, Azure, and Kubernetes.',
            requirements: 'Expertise in Docker, K8s, Terraform, and CI/CD. Professional certifications in AWS or Azure are highly preferred.',
            responsibilities: 'Build hands-on lab environments, deliver technical deep-dives, and contribute to our DevOps curriculum strategy.',
            salaryRange: '₹22L - ₹35L per annum',
            status: 'OPEN',
            isFeatured: true,
        },
        {
            title: 'Enterprise AI Strategy Consultant',
            department: 'Emerging Tech',
            location: 'Remote',
            type: 'Contract',
            description: 'Lead our initiative in AI-driven project management and general corporate AI training.',
            requirements: 'Strong background in LLMs, prompt engineering, and AI integration for business processes.',
            responsibilities: 'Conduct ICAgile AI course modules, develop case studies for AI adoption, and consult for enterprise clients.',
            salaryRange: '₹2,500 - ₹5,000 per hour',
            status: 'OPEN',
            isFeatured: false,
        },
        {
            title: 'Product Marketing Manager (EdTech)',
            department: 'Marketing',
            location: 'Remote',
            type: 'Full-time',
            description: 'Own the marketing lifecycle for our professional certification courses. Drive growth through strategic positioning.',
            requirements: '5+ years in EdTech marketing. Deep understanding of B2B and B2C sales funnels.',
            responsibilities: 'Execute cross-channel campaigns, manage course launches, and analyze customer behavior for optimization.',
            salaryRange: '₹12L - ₹20L per annum',
            status: 'OPEN',
            isFeatured: false,
        },
        {
            title: 'Full-stack Developer (Next.js / Node.js)',
            department: 'Engineering',
            location: 'Remote',
            type: 'Part-time',
            description: 'Help us scale our internal LMS and Admin Hub. Build features that impact thousands of learners.',
            requirements: 'Strong proficiency in TypeScript, React, Node.js, and PostgreSQL. Experience with Drizzle ORM is a plus.',
            responsibilities: 'Develop new features for the student portal, optimize backend performance, and maintain the admin dashboard.',
            salaryRange: '₹50,000 - ₹80,000 per month',
            status: 'OPEN',
            isFeatured: false,
        },
        {
            title: 'Sales & Enrollment Specialist',
            department: 'Sales',
            location: 'Mumbai / Pune',
            type: 'Full-time',
            description: 'Engage with professionals looking to upskill and guide them through our certification paths.',
            requirements: 'Excellent communication skills. High empathy and persuasion skills. Prior experience in EdTech sales.',
            responsibilities: 'Manage lead inquiries, conduct career counseling calls, and meet monthly enrollment targets.',
            salaryRange: '₹6L - ₹10L (Fixed) + High Incentives',
            status: 'OPEN',
            isFeatured: true,
        },
        {
            title: 'Instructional Designer / Content Developer',
            department: 'Content',
            location: 'Remote',
            type: 'Full-time',
            description: 'Create engaging, high-quality learning materials for Project Management and Agile disciplines.',
            requirements: 'PMP or Prince2 certified preferred. Experience in creating video course scripts and interactive quizzes.',
            responsibilities: 'Draft course workbooks, design presentation decks, and ensure all content aligns with global certification standards.',
            salaryRange: '₹8L - ₹15L per annum',
            status: 'OPEN',
            isFeatured: false,
        },
        {
            title: 'Cyber Security Instructor',
            department: 'Technical Training',
            location: 'Delhi / Remote',
            type: 'Full-time',
            description: 'Deliver high-impact training for CISM, CISSP, and Ethical Hacking.',
            requirements: 'Active CISM or CISSP certification. 5+ years in defensive or offensive security roles.',
            responsibilities: 'Lead certification prep batches, mentors students through real-world security scenarios.',
            salaryRange: '₹20L - ₹32L per annum',
            status: 'OPEN',
            isFeatured: true,
        }
    ];

    try {
        // Clear existing careers first to avoid duplicates if re-running
        console.log('Cleaning up existing careers data...');
        await db.delete(careers);
        
        console.log('Inserting seed data...');
        await db.insert(careers).values(sampleCareers);
        console.log('--- Successfully Seeded 8 Career Roles ---');
    } catch (error) {
        console.error('!!! Error seeding careers:', error);
    }
    
    process.exit(0);
};

seedCareers();
