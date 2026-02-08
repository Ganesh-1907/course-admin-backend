# Quick Start Guide - Course Management Backend

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure MongoDB

Edit `.env` and set your MongoDB connection:

```env
MONGODB_URI=mongodb://localhost:27017/course-management
# OR for MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/course-management?retryWrites=true&w=majority
```

### 3. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production build & run
npm run build
npm start
```

**Server will run on:** `http://localhost:5000/api`

---

## 📋 API Endpoints Summary

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Admin login |
| POST | `/api/admin/auth/logout` | Admin logout |
| GET | `/api/admin/auth/profile` | Get profile |
| PUT | `/api/admin/auth/profile` | Update profile |
| PUT | `/api/admin/auth/change-password` | Change password |
| POST | `/api/admin/courses` | Create course |
| GET | `/api/admin/courses` | List courses |
| GET | `/api/admin/courses/:id` | Get course |
| PUT | `/api/admin/courses/:id` | Update course |
| DELETE | `/api/admin/courses/:id` | Delete course |
| PATCH | `/api/admin/courses/:id/activate` | Activate course |
| PATCH | `/api/admin/courses/:id/deactivate` | Deactivate course |
| GET | `/api/admin/registrations` | List registrations |
| GET | `/api/admin/registrations/:id` | Get registration |
| PATCH | `/api/admin/registrations/:id/status` | Update status |
| GET | `/api/admin/registrations/dashboard/statistics` | Dashboard stats |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user/auth/register` | Register user |
| POST | `/api/user/auth/login` | Login user |
| GET | `/api/user/auth/profile` | Get profile |
| PUT | `/api/user/auth/profile` | Update profile |
| GET | `/api/user/courses` | List courses |
| GET | `/api/user/courses/search` | Search courses |
| GET | `/api/user/courses/:id` | Get course details |
| POST | `/api/user/registrations` | Register for course |
| GET | `/api/user/registrations` | List registrations |
| POST | `/api/user/registrations/:id/payment` | Process payment |
| POST | `/api/user/registrations/:id/review` | Submit review |
| PATCH | `/api/user/registrations/:id/cancel` | Cancel registration |

---

## 🔑 Authentication

All protected endpoints require:

```
Authorization: Bearer <your_jwt_token>
```

Get token from login/register endpoints.

---

## 📊 Example Requests

### Admin Login

```bash
curl -X POST http://localhost:5000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Create Course

```bash
curl -X POST http://localhost:5000/api/admin/courses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseName": "Agile Mastery",
    "description": "Learn Agile methodologies",
    "mentor": "John Doe",
    "serviceType": "Agile",
    "startDate": "2024-02-01",
    "endDate": "2024-04-01",
    "price": 5000,
    "discountPercentage": 10
  }'
```

### List Courses (Public)

```bash
curl http://localhost:5000/api/user/courses?page=1&limit=10
```

### User Registration

```bash
curl -X POST http://localhost:5000/api/user/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "+919876543210",
    "password": "pass123",
    "confirmPassword": "pass123",
    "acceptTerms": true
  }'
```

---

## 🔧 Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/course-management

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── types/           # TypeScript interfaces
│   ├── models/          # MongoDB schemas
│   ├── controllers/     # Business logic
│   │   ├── admin/
│   │   └── user/
│   ├── routes/          # API endpoints
│   │   ├── admin/
│   │   └── user/
│   ├── middleware/      # Auth, error handling
│   ├── config/          # Database, env
│   ├── utils/           # Helper functions
│   └── server.ts        # Main entry point
├── package.json
├── tsconfig.json
├── .env
└── .gitignore
```

---

## 🛠️ npm Scripts

```bash
npm run dev          # Development with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Run production build
npm run clean        # Remove dist folder
```

---

## 🗄️ Database Setup

### MongoDB Locally

```bash
# Start MongoDB service
mongod

# Connect to database
mongo mongodb://localhost:27017/course-management
```

### MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Copy connection string
4. Update `MONGODB_URI` in `.env`

---

## ✅ Test API

Use Postman, Insomnia, or curl to test endpoints:

1. Start server: `npm run dev`
2. Open browser: `http://localhost:5000/api/health`
3. You should see: `{ "success": true, "message": "API is running" }`

---

## 🐛 Common Issues

### Port Already in Use

```bash
# Change PORT in .env or kill process using port 5000
lsof -i :5000
kill -9 <PID>
```

### MongoDB Connection Error

- Check MongoDB is running
- Verify `MONGODB_URI` in `.env`
- Ensure MongoDB credentials are correct

### TypeScript Errors

```bash
npm run build  # Check for compilation errors
```

---

## 📚 Full Documentation

See `README.md` for complete API documentation.

---

## 🎯 Next Steps

1. Set up MongoDB connection
2. Run `npm install`
3. Start development server: `npm run dev`
4. Test API endpoints with Postman
5. Integrate frontend with API
6. Deploy to production

---

## 💡 Tips

- Use Postman collection for organized testing
- Check network tab in browser DevTools for requests
- Review MongoDB documents in MongoDB Compass
- Use VS Code REST Client extension for quick testing

---

Happy coding! 🚀
