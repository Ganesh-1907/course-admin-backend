-- Database Schema Configuration (Simplified)

-- 1. Service Types Table
CREATE TABLE service_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Unified Users Table (Admin + Participants)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'participant', -- admin, participant, super_admin
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Courses Table (formerly course_master)
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_type_id INTEGER REFERENCES service_types(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Course Schedules Table
CREATE TABLE course_schedules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    mentor VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    batch_type VARCHAR(50), -- Online, Classroom, etc.
    course_type VARCHAR(50), -- Certification, Workshop, etc.
    address TEXT,
    language VARCHAR(50) DEFAULT 'English',
    description TEXT,
    difficulty_level VARCHAR(50) DEFAULT 'Intermediate',
    duration INTEGER, -- In days or hours
    brochure_url VARCHAR(1024),
    
    -- JSONB Pricing structure (Array of Objects)
    -- Format: [
    --   {"country": "USA", "currency": "USD", "price": 0.00, "discountPercentage": 0, "finalPrice": 0.00},
    --   ...
    -- ]
    pricing JSONB NOT NULL,
    
    enrollment_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Registrations Table
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES course_schedules(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    payment_id VARCHAR(255),
    amount_paid DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    transaction_date TIMESTAMP WITH TIME ZONE,
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_courses_name ON courses(name);
CREATE INDEX idx_schedules_course_id ON course_schedules(course_id);
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_schedule_id ON registrations(schedule_id);
