import { db, courses, serviceTypes, courseSchedules } from '../models';
import { sql } from 'drizzle-orm';

const courseData = [
    { name: "CSM Certification Training Course", type: "AGILE" },
    { name: "CSPO Certification Training", type: "AGILE" },
    { name: "Advanced Certified ScrumMaster (A-CSM) Certification Training", type: "AGILE" },
    { name: "Advanced Certified Scrum Product Owner (A-CSPO) Certification Training", type: "AGILE" },
    { name: "Certified Scrum Developer® (CSD) Certification Training", type: "AGILE" },
    { name: "Agile and Scrum Training", type: "AGILE" },
    { name: "PMI-ACP Certification Training Course", type: "AGILE" },
    { name: "PSM Certification Training Course", type: "AGILE" },
    { name: "Certified Agile Scaling Practitioner 1 (CASP 1) Certification Training", type: "AGILE" },
    { name: "Certified Agile Facilitator (CAF) Certification Training", type: "AGILE" },
    { name: "Professional Scrum Master™ Advanced (PSM- A) Certification Training", type: "AGILE" },
    { name: "Certified Agile Leader® (CAL-1™) Training for Organizational Managers", type: "AGILE" },
    { name: "Advanced-Certified Scrum Developer® (A-CSD) Certification Training", type: "AGILE" },
    { name: "ICP ACC® (ICAgile Certified Agile Coaching) Certification Training", type: "AGILE" },
    { name: "Professional Scrum with Kanban™ (PSK) Training", type: "AGILE" },
    { name: "Professional Scrum Product Owner (PSPO) Certification Training", type: "AGILE" },
    { name: "Scrum@Scale™ Certification Training", type: "AGILE" },
    { name: "ICAgile Coaching Agile Transformations (ICP-CAT) Certification Training", type: "AGILE" },
    { name: "Professional Agile Leadership - Essentials (PAL-E) Certification Training", type: "AGILE" },
    { name: "Behaviour Driven Development (BDD) Training", type: "AGILE" },
    { name: "Test Driven Development (TDD) Training", type: "AGILE" },
    { name: "ICAgile Enterprise Agile Coaching (ICP-ENT) Certification Course Training", type: "AGILE" },
    { name: "ICAgile Agile Fundamental (ICP) Certification Course Training", type: "AGILE" },
    { name: "Agile Fundamentals including Scrum and Kanban Training", type: "AGILE" },
    { name: "Manage Agile Projects Using Scrum Certification Training", type: "AGILE" },
    { name: "Agile for Executives Training", type: "AGILE" },
    { name: "Agile for Managers Training", type: "AGILE" },
    { name: "Agile Product Owner Training", type: "AGILE" },
    { name: "Applying Professional Scrum (APS) Certification Training", type: "AGILE" },
    { name: "Agile Release Planning Certification Training", type: "AGILE" },
    { name: "Certified Scrum Professional® - Product Owner (CSP®-PO) Certification Training", type: "AGILE" },
    { name: "Agile Project Management Course", type: "AGILE" },
    { name: "Jira Software Training for Agile Projects", type: "AGILE" },
    { name: "ICAgile Certified Agile Leadership (ICP-LEA) Training – Lead with Agility", type: "AGILE" },
    { name: "ICAgile Product Management (ICP-PDM) Certification Training", type: "AGILE" },
    { name: "ICAgile Agile Project & Delivery Management (ICP-APM) Certification Training", type: "AGILE" },
    { name: "PSPBM Skills Certification Course", type: "AGILE" },
    { name: "ICAgile Agile Product Ownership (ICP-APO) Certification Training", type: "AGILE" },
    { name: "APK Certification Course", type: "AGILE" },
    { name: "ICAgile Agile Team Facilitation Certification (ICP-ATF) Training", type: "AGILE" },
    { name: "ICAgile Foundations of AI (ICP-FAI) Certification Training", type: "AGILE" },
    { name: "ICAgile Lean Portfolio Management (ICP-LPM) Certification Training", type: "AGILE" },
    { name: "ICAgile AI for Customer Insights Micro Credential Certification Training", type: "AGILE" },
    { name: "ICAgile AI for Product Strategy Micro-Credential Course", type: "AGILE" },
    { name: "ICAgile People Development (ICP-PDV) Certification Training", type: "AGILE" },
    { name: "ICAgile Systems Coaching (ICP-SYS) Certification Training", type: "AGILE" },
    { name: "Leading SAFe® 6.0 Training with SAFe Agilist Certification", type: "SAFE" },
    { name: "AI-Empowered SAFe® Scrum Master Certification Training", type: "SAFE" },
    { name: "SAFe® 6.0 AI-Empowered Product Owner/Product Manager (POPM) Certification Training", type: "SAFE" },
    { name: "SAFe® 6.0 Practice Consultant (SPC) Certification Training", type: "SAFE" },
    { name: "SAFe 6 Lean Portfolio Management (LPM) Certification Training", type: "SAFE" },
    { name: "SAFe® for Architects Certification Training", type: "SAFE" },
    { name: "SAFe for Teams 6.0 (SP) Certification Training", type: "SAFE" },
    { name: "Advanced SAFe Practice Consultant (ASPC) Certification Path", type: "SAFE" },
    { name: "AI-Empowered SAFe® 6.0 Release Train Engineer (RTE) Certification Training", type: "SAFE" },
    { name: "SAFe® 6.0 DevOps (SDP) Certification Training", type: "SAFE" },
    { name: "Advanced Facilitator: Conflict & Collaboration Micro-Credential Course", type: "SAFE" },
    { name: "Achieving Responsible AI with SAFe Micro-credential Course", type: "SAFE" },
    { name: "Agile HR Explorer (AHRE) Training and Certification", type: "SAFE" },
    { name: "Advanced Scrum Master Certification Path", type: "SAFE" },
    { name: "SAFe® for Hardware (HW) Certification Training", type: "SAFE" },
    { name: "AI-Native Foundations Certification Training Course", type: "SAFE" },
    { name: "AI-Native Change Agent Certification Training Course", type: "SAFE" },
    { name: "PMP® Certification Training - Project Management Professional", type: "PROJECT" },
    { name: "Project Management Techniques Training", type: "PROJECT" },
    { name: "PRINCE2 Foundation and Practitioner Certification Training", type: "PROJECT" },
    { name: "PRINCE2 Foundation Certification Training", type: "PROJECT" },
    { name: "PRINCE2 Practitioner Certification Training Course", type: "PROJECT" },
    { name: "CAPM Certification Training", type: "PROJECT" },
    { name: "PRINCE2 Agile Foundation Certification Training", type: "PROJECT" },
    { name: "Primavera P6 (Basic to Advanced) Training", type: "PROJECT" },
    { name: "PRINCE2 Agile Practitioner Certification Training", type: "PROJECT" },
    { name: "PRINCE2 Agile Foundation and Practitioner Certification Training Course", type: "PROJECT" },
    { name: "PgMP Certification Training Course", type: "PROJECT" },
    { name: "Project Management Fundamentals Training", type: "PROJECT" },
    { name: "PfMP Certification Training Course", type: "PROJECT" },
    { name: "Disciplined Agile® Foundations Training", type: "PROJECT" },
    { name: "PMI Certified Professional in Managing AI (PMI-CPMAI)™ Certification Training", type: "PROJECT" },
    { name: "Business Case Writing Training", type: "BUSINESS" },
    { name: "Conflict Management Training", type: "BUSINESS" },
    { name: "Certified Business Analysis Professional (CBAP®) Training", type: "BUSINESS" },
    { name: "Change Management Training", type: "BUSINESS" },
    { name: "Certification of Capability in Business Analysis™ (CCBA®) Certification Training", type: "BUSINESS" },
    { name: "Entry Certificate in Business Analysis (ECBA) Certification Training", type: "BUSINESS" },
    { name: "Design Thinking Training Online", type: "BUSINESS" },
    { name: "Agile Analysis Certification (IIBA®-AAC) Certification Training", type: "BUSINESS" },
    { name: "Generative AI for Business & IT Leaders & Managers", type: "Generative AI" },
    { name: "Generative AI for Business Analysts & Functional IT Consultants", type: "Generative AI" },
    { name: "Cloud Fundamentals for Business Managers & Product Managers", type: "Generative AI" },
    { name: "Generative AI Architect - Advanced Program", type: "Generative AI" },
    { name: "Multi-cloud FinOps: AWS, GCP, Azure", type: "Generative AI" },
    { name: "Introduction to Generative AI Training Course", type: "Generative AI" },
    { name: "Generative AI for Agile Leaders Training", type: "Generative AI" },
    { name: "Generative AI for Scrum Masters Training", type: "Generative AI" },
    { name: "Generative AI in HR Certification Course", type: "Generative AI" },
    { name: "Generative AI for Software Developers Training Course", type: "Generative AI" },
    { name: "Generative AI for Project Managers Training", type: "Generative AI" },
    { name: "Prompt Engineering Course", type: "Generative AI" },
    { name: "Generative AI for Product Owners/Product Managers Certification Training", type: "Generative AI" },
    { name: "Mastering Generative AI Tools Online", type: "Generative AI" },
    { name: "Agile Objectives and Key Results (Agile OKRs) MicroCredential Training", type: "Microcredentials" },
    { name: "AI for Scrum Masters Micro-credential Course", type: "Microcredentials" },
    { name: "AI for Product Owners Micro-credential Course", type: "Microcredentials" },
    { name: "Scrum Essentials Micro-credential Training", type: "Microcredentials" },
    { name: "Conflict Management Skills Training", type: "Microcredentials" },
    { name: "ICAgile AI for Product Metrics Micro Credential Certification Training", type: "Microcredentials" },
    { name: "ICAgile AI for Product Planning Micro Credential Course Training", type: "Microcredentials" },
    { name: "Scrum Better with Kanban (SBK) Micro-credential Training", type: "Microcredentials" },
    { name: "ICAgile AI for Stakeholder Management Micro Credential Course Certification Training", type: "Microcredentials" },
    { name: "ICAgile AI for Product Discovery Micro Credential Course Training", type: "Microcredentials" },
    { name: "ICAgile AI for Product Strategy Micro-Credential Course", type: "Microcredentials" },
    { name: "ICAgile AI for Customer Insights Micro Credential Certification Training", type: "Microcredentials" },
    { name: "Agile Coaching Skills Microcredential Course", type: "Microcredentials" },
    { name: "DevOps Foundation Certification Training", type: "DEVOPS" },
    { name: "Docker and Kubernetes Training", type: "DEVOPS" },
    { name: "DevSecOps Foundation DSOF℠", type: "DEVOPS" },
    { name: "Agile Essentials Microcredential Training Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Scrum Essentials Microcredential Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Metrics that Matter: Improving Product Outcomes Microcredential Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Introduction to Agile Coaching Microcredential Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Get Started with DevOps Microcredentials Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Coaching for Transformation: Sustaining Change Microcredential Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Coaching for Transformation: Sustaining Change Microcredential Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Coaching for Change: Making Agility Work Microcredential Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Change Management: Overcoming Resistance for Agile Transformation Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Becoming an Agile Coach Microcredential Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "AI for Product Discovery and Strategy Microcredentials Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Agile Stakeholder Engagement: Effective Communication Strategies Microcredential Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Agile for Marketing On-Demand Microcredentials Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Agile for HR On-Demand Microcredentials Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "Agile Coaching Skills Microcredential Training Course", type: "ON DEMAND MICROCREDENTIALS" },
    { name: "ITIL® Foundation Certification With ITIL4 Training", type: "SERVICE" },
    { name: "Six Sigma Fundamentals Certification Training", type: "QUALITY" },
    { name: "Lean Six Sigma Yellow Belt Certification Training Program", type: "QUALITY" },
    { name: "Lean Six Sigma Green Belt Certification Training Program", type: "QUALITY" },
    { name: "Lean Six Sigma Black Belt Certification Training Program", type: "QUALITY" },
    { name: "Root Cause Analysis (RCA) Training", type: "QUALITY" },
    { name: "AWS SysOps Administrator Certification Training", type: "CLOUD COMPUTING" },
    { name: "AWS DevOps Engineer Certification Training", type: "CLOUD COMPUTING" },
    { name: "AWS Cloud Practitioner Certification Training", type: "CLOUD COMPUTING" },
    { name: "AWS Solutions Architect Certification Training", type: "CLOUD COMPUTING" },
    { name: "AWS Cloud Computing Certification Training", type: "CLOUD COMPUTING" },
    { name: "Data Science with Python Training", type: "DATA SCIENCE" },
    { name: "Python Django Certification Training", type: "DATA SCIENCE" },
    { name: "Introduction to AI and ML Certification Training", type: "DATA SCIENCE" },
    { name: "Artificial Intelligence Certification Training", type: "DATA SCIENCE" },
    { name: "Data Science Certification Training", type: "DATA SCIENCE" },
    { name: "Certified Artificial Intelligence For Agile Leaders Certification", type: "DATA SCIENCE" },
    { name: "Angular JS Training", type: "TECHNOLOGY" },
    { name: "React Native Certification Training", type: "TECHNOLOGY" },
    { name: "React JS Training", type: "TECHNOLOGY" },
    { name: "Introduction To Blockchain Certification Training", type: "TECHNOLOGY" },
    { name: "Python For Beginners Training", type: "TECHNOLOGY" },
    { name: "Python Programming Certification Training", type: "TECHNOLOGY" },
    { name: "PCI DSS Certification and Training", type: "OTHERS" },
    { name: "Microsoft Certified DevOps Engineer Expert (AZ-400) Certification Training", type: "OTHERS" },
    { name: "Microsoft Power BI Training", type: "OTHERS" },
    { name: "Microsoft Azure Fundamentals AZ-900 Certification Training", type: "OTHERS" },
    { name: "Microsoft Certified: Azure Administrator Associate AZ-104 Training", type: "OTHERS" },
    { name: "Microsoft Azure Developer Associate (AZ-204) Certification Course", type: "OTHERS" },
    { name: "Certified Information Systems Security Professional (CISSP) Training", type: "OTHERS" },
    { name: "Microsoft Certified Azure Solutions Architect Expert (AZ-305) Certification Training", type: "OTHERS" }
];

const seedCourses = async () => {
    try {
        console.log('✓ Starting Course/Service Seeding...');

        // Clear existing courses and service types
        // Also clear schedules and registrations because they depend on courses
        await db.execute(sql`TRUNCATE TABLE registrations, course_schedules, courses, service_types RESTART IDENTITY CASCADE`);
        console.log('✓ Cleared existing courses, schedules, and service types');

        // Extract unique service types
        const uniqueTypes = Array.from(new Set(courseData.map(c => c.type)));

        // Seed Service Types
        const createdServiceTypes = await db.insert(serviceTypes).values(
            uniqueTypes.map(name => ({ name }))
        ).returning();

        const typeMap = new Map(createdServiceTypes.map(t => [t.name, t.id]));
        console.log(`✓ Seeded ${createdServiceTypes.length} Service Types`);

        // Seed Courses
        const coursesToInsert = courseData.map(c => ({
            name: c.name,
            serviceTypeId: typeMap.get(c.type)
        }));

        const insertedCourses = await db.insert(courses).values(coursesToInsert).returning();
        console.log(`✓ Successfully seeded ${insertedCourses.length} courses.`);

        process.exit(0);
    } catch (error) {
        console.error('✗ Seed failed:', error);
        process.exit(1);
    }
};

seedCourses();
