-- Database Schema Configuration

-- 1. Service Types Table
CREATE TABLE service_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Unified Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    location VARCHAR(255),
    timezone VARCHAR(100),
    dob DATE,
    country VARCHAR(100),
    state VARCHAR(100),
    gender VARCHAR(50),
    linkedin_url VARCHAR(512),
    facebook_url VARCHAR(512),
    twitter_url VARCHAR(512),
    website_url VARCHAR(512),
    role VARCHAR(50) NOT NULL DEFAULT 'participant',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Courses Table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_type_id INTEGER REFERENCES service_types(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Enquiries Table
CREATE TABLE enquiries (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    course_name VARCHAR(255),
    message TEXT,
    enquiry_type VARCHAR(50) DEFAULT 'GENERAL',
    status VARCHAR(50) DEFAULT 'NEW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    contacted_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    education VARCHAR(255)
);

-- 5. Mentors Table
CREATE TABLE mentors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    description TEXT,
    rating DECIMAL(2, 1) DEFAULT 0.0,
    years_of_experience INTEGER NOT NULL DEFAULT 0,
    linkedin_id VARCHAR(255),
    photo_url VARCHAR(1024),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Webinars Table
CREATE TABLE webinars (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    webinar_date DATE NOT NULL,
    poster_url VARCHAR(1024) NOT NULL,
    location VARCHAR(100) NOT NULL,
    primary_mentor_id INTEGER NOT NULL REFERENCES mentors(id),
    secondary_mentor_id INTEGER REFERENCES mentors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Mentor-Course Mapping Table
CREATE TABLE mentor_course_mappings (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT idx_mentor_course_mappings_unique UNIQUE (mentor_id, course_id)
);

-- 8. Course Schedules Table
CREATE TABLE course_schedules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    batch_type VARCHAR(50),
    course_type VARCHAR(50),
    address TEXT,
    language VARCHAR(50) DEFAULT 'English',
    description TEXT,
    difficulty_level VARCHAR(50) DEFAULT 'Intermediate',
    duration INTEGER,
    brochure_url VARCHAR(1024),
    pricing JSONB NOT NULL,
    max_participants INTEGER,
    capacity_remaining INTEGER,
    enrollment_count INTEGER DEFAULT 0,
    plan_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Registrations Table
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES course_schedules(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    payment_id VARCHAR(255),
    payment_gateway VARCHAR(50),
    amount_paid DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    transaction_date TIMESTAMP WITH TIME ZONE,
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    status VARCHAR(50) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Cart Items Table
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES course_schedules(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_courses_name ON courses(name);
CREATE INDEX idx_enquiries_email ON enquiries(email);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_mentors_name ON mentors(name);
CREATE INDEX idx_mentors_specialization ON mentors(specialization);
CREATE INDEX idx_webinars_webinar_date ON webinars(webinar_date);
CREATE INDEX idx_webinars_location ON webinars(location);
CREATE INDEX idx_webinars_primary_mentor_id ON webinars(primary_mentor_id);
CREATE INDEX idx_mentor_course_mappings_mentor_id ON mentor_course_mappings(mentor_id);
CREATE INDEX idx_mentor_course_mappings_course_id ON mentor_course_mappings(course_id);
CREATE INDEX idx_schedules_course_id ON course_schedules(course_id);
CREATE INDEX idx_schedules_mentor_id ON course_schedules(mentor_id);
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_schedule_id ON registrations(schedule_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- View: Course schedules with mentor details
CREATE VIEW view_course_schedules AS
SELECT
    cs.id AS schedule_id,
    c.id AS course_id,
    c.name AS course_name,
    st.id AS service_type_id,
    st.name AS service_type_name,
    m.name AS mentor,
    m.id AS mentor_id,
    m.photo_url AS mentor_photo_url,
    m.designation AS mentor_designation,
    m.specialization AS mentor_specialization,
    m.rating AS mentor_rating,
    m.years_of_experience AS mentor_years_of_experience,
    m.linkedin_id AS mentor_linkedin_id,
    cs.start_date,
    cs.end_date,
    cs.start_time,
    cs.end_time,
    cs.batch_type,
    cs.course_type,
    cs.address,
    cs.language,
    cs.description,
    cs.difficulty_level,
    cs.duration,
    cs.brochure_url,
    cs.pricing,
    cs.max_participants,
    cs.capacity_remaining,
    cs.enrollment_count,
    cs.plan_available,
    cs.is_active,
    cs.created_at,
    cs.updated_at
FROM course_schedules cs
JOIN courses c ON cs.course_id = c.id
JOIN mentors m ON cs.mentor_id = m.id
LEFT JOIN service_types st ON c.service_type_id = st.id;
