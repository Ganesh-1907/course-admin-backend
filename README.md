# Course Management System - Backend API

A production-ready Node.js/Express backend for a course management admin panel with TypeScript, MongoDB, and JWT authentication.

## Technology Stack

- **Node.js** with **TypeScript** (ES2020)
- **Express.js** 4.18.2 - Web framework
- **MongoDB** & **Mongoose** 8.0.3 - Database & ODM
- **JWT** (jsonwebtoken) - Authentication
- **Bcryptjs** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin requests
- **Morgan** - HTTP logging
- **Multer** - File uploads (ready)

## Project Structure

```
backend/
├── src/
│   ├── types/
│   │   ├── admin.ts
│   │   ├── course.ts
│   │   ├── participant.ts
│   │   ├── registration.ts
│   │   └── common.ts
│   ├── models/
│   │   ├── Admin.ts
│   │   ├── Course.ts
│   │   ├── Participant.ts
│   │   ├── Registration.ts
│   │   └── index.ts
│   ├── controllers/
│   │   ├── admin/
│   │   │   ├── authController.ts
│   │   │   ├── courseController.ts
│   │   │   └── registrationController.ts
│   │   └── user/
│   │       ├── authController.ts
│   │       ├── courseController.ts
│   │       └── registrationController.ts
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── authRoutes.ts
│   │   │   ├── courseRoutes.ts
│   │   │   └── registrationRoutes.ts
│   │   ├── user/
│   │   │   ├── authRoutes.ts
│   │   │   ├── courseRoutes.ts
│   │   │   └── registrationRoutes.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── auth.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── database.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── server.ts
├── package.json
├── tsconfig.json
├── .env
└── .gitignore
```

## Installation & Setup

### Prerequisites

- Node.js (v16+ recommended)
- MongoDB (local or Atlas connection string)
- npm or yarn package manager

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/course-management

# Server
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Step 3: Run the Server

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Production mode
npm run start

# Clean build
npm run clean
```

The API will be available at `http://localhost:5000/api`

## API Endpoints

### Health Check

```
GET /api/health
```

---

## ADMIN ENDPOINTS

### Authentication

#### Admin Login

```
POST /api/admin/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Admin Name",
      "email": "admin@example.com"
    }
  },
  "message": "Login successful",
  "statusCode": 200
}
```

#### Admin Logout

```
POST /api/admin/auth/logout
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "message": "Logout successful"
}
```

#### Get Admin Profile

```
GET /api/admin/auth/profile
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { ... admin object ... },
  "message": "Profile retrieved successfully"
}
```

#### Update Admin Profile

```
PUT /api/admin/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "phone": "+919876543210",
  "department": "IT"
}

Response (200 OK):
{
  "success": true,
  "data": { ... updated admin ... }
}
```

#### Change Password

```
PUT /api/admin/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456",
  "confirmPassword": "newpass456"
}

Response (200 OK):
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Courses Management

#### Create Course

```
POST /api/admin/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseName": "Agile Mastery",
  "description": "Complete Agile training course",
  "mentor": "John Doe",
  "serviceType": "Agile",
  "startDate": "2024-02-01",
  "endDate": "2024-04-01",
  "price": 5000,
  "discountPercentage": 10,
  "difficultyLevel": "Intermediate",
  "duration": "40 hours",
  "maxParticipants": 50
}

Response (201 Created):
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "courseId": "CRS1001",
    "courseName": "Agile Mastery",
    "finalPrice": 4500,
    ...
  },
  "message": "Course created successfully"
}
```

#### Get All Courses

```
GET /api/admin/courses?page=1&limit=10&search=Agile&serviceType=Agile
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "courses": [ ... array of courses ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### Get Course by ID

```
GET /api/admin/courses/:courseId
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { ... course details ... }
}
```

#### Update Course

```
PUT /api/admin/courses/:courseId
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseName": "Updated Name",
  "price": 6000,
  "discountPercentage": 15
}

Response (200 OK):
{
  "success": true,
  "data": { ... updated course ... }
}
```

#### Delete Course

```
DELETE /api/admin/courses/:courseId
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "message": "Course deleted successfully"
}
```

#### Activate Course

```
PATCH /api/admin/courses/:courseId/activate
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { ... course with isActive: true ... }
}
```

#### Deactivate Course

```
PATCH /api/admin/courses/:courseId/deactivate
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { ... course with isActive: false ... }
}
```

---

### Registrations Management

#### Get All Registrations

```
GET /api/admin/registrations?page=1&limit=10&status=CONFIRMED&paymentStatus=PAID
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "registrations": [ ... array of registrations ... ],
    "pagination": { ... }
  }
}
```

#### Get Registration Details

```
GET /api/admin/registrations/detail/:registrationId
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { ... registration details ... }
}
```

#### Update Registration Status

```
PATCH /api/admin/registrations/:registrationId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "COMPLETED",
  "notes": "Course completed successfully"
}

Response (200 OK):
{
  "success": true,
  "data": { ... updated registration ... }
}
```

#### Cancel Registration

```
PATCH /api/admin/registrations/:registrationId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "User requested cancellation"
}

Response (200 OK):
{
  "success": true,
  "message": "Registration cancelled successfully"
}
```

#### Issue Certificate

```
POST /api/admin/registrations/:registrationId/certificate
Authorization: Bearer <token>
Content-Type: application/json

{
  "certificateUrl": "https://example.com/cert/123.pdf",
  "certificateName": "Agile_Mastery_Certificate.pdf"
}

Response (200 OK):
{
  "success": true,
  "data": { ... registration with certificate ... }
}
```

#### Get Payment Details

```
GET /api/admin/registrations/:registrationId/payment
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "registrationNumber": "REG1704067200000123",
    "originalPrice": 5000,
    "finalAmount": 4500,
    "amountPaid": 4500,
    "paymentStatus": "PAID",
    "paymentMode": "Card",
    ...
  }
}
```

#### Dashboard Statistics

```
GET /api/admin/registrations/dashboard/statistics
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "courses": { "total": 15, "active": 12, "inactive": 3 },
    "registrations": { "total": 45, "confirmed": 40, "pending": 5 },
    "payments": { "total": 40, "totalRevenue": 180000 },
    "participants": { "total": 35 }
  }
}
```

---

## USER ENDPOINTS

### Authentication

#### Register User

```
POST /api/user/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "+919876543210",
  "password": "password123",
  "confirmPassword": "password123",
  "acceptTerms": true
}

Response (201 Created):
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "participant": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "message": "Registration successful"
}
```

#### Login User

```
POST /api/user/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "participant": { ... }
  },
  "message": "Login successful"
}
```

#### Get User Profile

```
GET /api/user/auth/profile
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "+919876543210",
    "registeredCourses": [ ... ],
    ...
  }
}
```

#### Update User Profile

```
PUT /api/user/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "mobile": "+919876543211",
  "organization": "Tech Corp",
  "designation": "Manager",
  "yearsOfExperience": 5
}

Response (200 OK):
{
  "success": true,
  "data": { ... updated participant ... }
}
```

#### Change Password

```
PUT /api/user/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456",
  "confirmPassword": "newpass456"
}

Response (200 OK):
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Course Browsing

#### Get All Courses

```
GET /api/user/courses?page=1&limit=10&search=Agile&serviceType=Agile
(No authentication required)

Response (200 OK):
{
  "success": true,
  "data": {
    "courses": [ ... array of active courses ... ],
    "pagination": { ... }
  }
}
```

#### Search Courses

```
GET /api/user/courses/search?q=agile&page=1&limit=10
(No authentication required)

Response (200 OK):
{
  "success": true,
  "data": {
    "courses": [ ... matching courses ... ],
    "query": "agile",
    "pagination": { ... }
  }
}
```

#### Get Courses by Type

```
GET /api/user/courses/type/Agile?page=1&limit=10
(No authentication required)

Valid types: Agile, Service, SAFe, Project, Quality, Business, Generative AI

Response (200 OK):
{
  "success": true,
  "data": {
    "courses": [ ... courses of specific type ... ],
    "pagination": { ... }
  }
}
```

#### Get Course Details

```
GET /api/user/courses/:courseId
(No authentication required)

Response (200 OK):
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "courseId": "CRS1001",
    "courseName": "Agile Mastery",
    "description": "...",
    "price": 5000,
    "finalPrice": 4500,
    "registrationCount": 25,
    "avgRating": 4.5,
    ...
  }
}
```

#### Get Course Reviews

```
GET /api/user/courses/:courseId/reviews?page=1&limit=10
(No authentication required)

Response (200 OK):
{
  "success": true,
  "data": {
    "reviews": [
      {
        "rating": 5,
        "review": "Excellent course!",
        "participant": { "name": "John Doe" },
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### Registration & Payment

#### Register for Course

```
POST /api/user/registrations
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "507f1f77bcf86cd799439012"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "registrationNumber": "REG1704067200000123",
    "courseId": "507f1f77bcf86cd799439012",
    "participantId": "507f1f77bcf86cd799439013",
    "registrationStatus": "PENDING",
    "paymentStatus": "PENDING",
    "finalAmount": 4500,
    ...
  },
  "message": "Registration successful. Please proceed to payment."
}
```

#### Get User Registrations

```
GET /api/user/registrations?page=1&limit=10&status=CONFIRMED
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "registrations": [ ... user's registrations ... ],
    "pagination": { ... }
  }
}
```

#### Get Registration Details

```
GET /api/user/registrations/:registrationId
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": { ... detailed registration info ... }
}
```

#### Process Payment

```
POST /api/user/registrations/:registrationId/payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMode": "Card",
  "paymentId": "PAY123456789",
  "amountPaid": 4500
}

Response (200 OK):
{
  "success": true,
  "data": {
    ...registration with paymentStatus: PAID and registrationStatus: CONFIRMED...
  },
  "message": "Payment processed successfully. Registration confirmed!"
}
```

#### Submit Review

```
POST /api/user/registrations/:registrationId/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "review": "Excellent course, highly recommended!"
}

Response (200 OK):
{
  "success": true,
  "data": { ... registration with review ... }
}
```

#### Cancel Registration

```
PATCH /api/user/registrations/:registrationId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Unable to attend due to work commitments"
}

Response (200 OK):
{
  "success": true,
  "message": "Registration cancelled successfully"
}
```

#### Download Certificate

```
GET /api/user/registrations/:registrationId/certificate
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "url": "https://example.com/cert/123.pdf",
    "fileName": "Agile_Mastery_Certificate.pdf",
    "issuedDate": "2024-04-15T00:00:00Z"
  },
  "message": "Certificate ready for download"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

### Common Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The JWT token is obtained from:
- Admin Login: `POST /api/admin/auth/login`
- User Register: `POST /api/user/auth/register`
- User Login: `POST /api/user/auth/login`

Token expires in 7 days (configurable via `JWT_EXPIRY` in `.env`)

---

## Database Models

### Admin
- Email, Password (hashed), Role, Active status
- Name, Phone, Department
- Last login tracking

### Course
- Course ID (auto-incremented), Name, Description
- Mentor, Service Type, Difficulty Level
- Start/End dates, Duration
- Price, Discount, Final Price (auto-calculated)
- Active status, Enrollment count
- Optional: Course image, Brochure, Max participants

### Participant (User)
- Email (unique), Password (hashed), Mobile
- Name, Organization, Designation
- Years of experience, Address (nested)
- Status (ACTIVE/INACTIVE/SUSPENDED)
- Registered courses array
- Preferences (newsletter, notifications)

### Registration
- Registration Number (auto-generated, unique)
- Participant ID, Course ID
- Original & Final amount, Discount details
- Payment info (mode, ID, status)
- Registration status (PENDING/CONFIRMED/COMPLETED/CANCELLED)
- Review & Rating
- Certificate details
- Timestamps

---

## Development Notes

### TypeScript Configuration

- Target: ES2020
- Strict mode enabled
- Path aliases: `@models`, `@controllers`, `@routes`, `@middleware`, `@config`, `@utils`, `@types`

### Environment Variables Required

```env
MONGODB_URI=mongodb://localhost:27017/course-management
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
```

### Build & Run

```bash
# Development
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Clean build artifacts
npm run clean
```

---

## Future Enhancements

- [ ] CourseImportHistory model for bulk imports
- [ ] DashboardStats model for cached statistics
- [ ] ActivityLog model for audit trail
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Payment gateway integration (Stripe, Razorpay)
- [ ] File upload to cloud storage (S3)
- [ ] Rate limiting
- [ ] Request validation schemas (Joi/Zod)
- [ ] API documentation with Swagger/OpenAPI

---

## Support & Issues

For issues or feature requests, please contact the development team or create an issue in the repository.

---

## License

MIT License - Course Management System
# course-admin-backend
