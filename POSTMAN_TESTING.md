# API Testing Guide - Postman Collection

## 📱 Testing Your API

This guide provides example requests for testing all API endpoints.

---

## 🔐 Environment Setup in Postman

### 1. Create Environment Variables

In Postman, create an environment with these variables:

```json
{
  "base_url": "http://localhost:5000/api",
  "admin_token": "",
  "user_token": ""
}
```

### 2. Pre-request Script (for any endpoint)

Use this to set variables after login:

```javascript
// After admin login, run this in Tests tab:
if (pm.response.code === 200) {
    pm.environment.set("admin_token", pm.response.json().data.token);
}

// After user login, run this in Tests tab:
if (pm.response.code === 200) {
    pm.environment.set("user_token", pm.response.json().data.token);
}
```

---

## 🧪 Test Scenarios

### Scenario 1: Admin Workflow

#### Step 1: Admin Login
```
POST {{base_url}}/admin/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "_id": "...",
      "name": "Admin Name",
      "email": "admin@example.com"
    }
  },
  "message": "Login successful",
  "statusCode": 200
}
```

**Save token:** Copy token to `admin_token` environment variable

---

#### Step 2: Get Admin Profile
```
GET {{base_url}}/admin/auth/profile
Authorization: Bearer {{admin_token}}
```

---

#### Step 3: Create Course
```
POST {{base_url}}/admin/courses
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "courseName": "Advanced Agile Training",
  "description": "Master Agile methodologies and best practices",
  "mentor": "Jane Smith",
  "serviceType": "Agile",
  "startDate": "2024-03-01",
  "endDate": "2024-05-01",
  "price": 15000,
  "discountPercentage": 20,
  "difficultyLevel": "Advanced",
  "duration": "50 hours",
  "maxParticipants": 30
}
```

**Response will include:**
```json
{
  "courseId": "CRS1001",
  "courseName": "Advanced Agile Training",
  "finalPrice": 12000,
  ...
}
```

**Save courseId** for later use

---

#### Step 4: Get All Courses (with filters)
```
GET {{base_url}}/admin/courses?page=1&limit=10&serviceType=Agile&search=Agile
Authorization: Bearer {{admin_token}}
```

---

#### Step 5: Update Course
```
PUT {{base_url}}/admin/courses/[COURSE_ID]
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "price": 16000,
  "discountPercentage": 25,
  "maxParticipants": 40
}
```

---

#### Step 6: Activate Course
```
PATCH {{base_url}}/admin/courses/[COURSE_ID]/activate
Authorization: Bearer {{admin_token}}
```

---

#### Step 7: View Dashboard Stats
```
GET {{base_url}}/admin/registrations/dashboard/statistics
Authorization: Bearer {{admin_token}}
```

---

#### Step 8: Admin Logout
```
POST {{base_url}}/admin/auth/logout
Authorization: Bearer {{admin_token}}
```

---

### Scenario 2: User Workflow

#### Step 1: Register New User
```
POST {{base_url}}/user/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "mobile": "+919876543210",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "acceptTerms": true
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "participant": {
      "_id": "...",
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  },
  "message": "Registration successful",
  "statusCode": 201
}
```

**Save token** to `user_token` environment variable

---

#### Step 2: Get User Profile
```
GET {{base_url}}/user/auth/profile
Authorization: Bearer {{user_token}}
```

---

#### Step 3: Browse Courses (Public - No Auth)
```
GET {{base_url}}/user/courses?page=1&limit=10
```

---

#### Step 4: Search Courses (Public - No Auth)
```
GET {{base_url}}/user/courses/search?q=agile&page=1&limit=5
```

---

#### Step 5: Get Courses by Type (Public - No Auth)
```
GET {{base_url}}/user/courses/type/Agile?page=1&limit=10
```

Valid types:
- Agile
- Service
- SAFe
- Project
- Quality
- Business
- Generative AI

---

#### Step 6: Get Course Details (Public - No Auth)
```
GET {{base_url}}/user/courses/[COURSE_ID]
```

---

#### Step 7: Get Course Reviews
```
GET {{base_url}}/user/courses/[COURSE_ID]/reviews?page=1&limit=5
```

---

#### Step 8: Register for Course
```
POST {{base_url}}/user/registrations
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "courseId": "[COURSE_ID]"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "registrationNumber": "REG1704067200000123",
    "registrationStatus": "PENDING",
    "paymentStatus": "PENDING",
    "finalAmount": 12000,
    ...
  },
  "message": "Registration successful. Please proceed to payment."
}
```

**Save registrationId** for payment step

---

#### Step 9: Process Payment
```
POST {{base_url}}/user/registrations/[REGISTRATION_ID]/payment
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "paymentMode": "Card",
  "paymentId": "CARD123456789",
  "amountPaid": 12000
}
```

---

#### Step 10: Get Registrations
```
GET {{base_url}}/user/registrations?page=1&limit=10&status=CONFIRMED
Authorization: Bearer {{user_token}}
```

---

#### Step 11: Update Profile
```
PUT {{base_url}}/user/auth/profile
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "name": "John Doe Updated",
  "mobile": "+919876543211",
  "organization": "Tech Corporation",
  "designation": "Senior Developer",
  "yearsOfExperience": 8
}
```

---

#### Step 12: Submit Review
```
POST {{base_url}}/user/registrations/[REGISTRATION_ID]/review
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "rating": 5,
  "review": "Excellent course! Learned a lot about Agile methodologies. Highly recommend!"
}
```

---

#### Step 13: Cancel Registration
```
PATCH {{base_url}}/user/registrations/[REGISTRATION_ID]/cancel
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "reason": "Unable to attend due to work commitments"
}
```

---

#### Step 14: Change Password
```
PUT {{base_url}}/user/auth/change-password
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!",
  "confirmPassword": "NewPassword456!"
}
```

---

### Scenario 3: Admin Registration Management

#### Step 1: Get All Registrations
```
GET {{base_url}}/admin/registrations?page=1&limit=10&status=CONFIRMED&paymentStatus=PAID
Authorization: Bearer {{admin_token}}
```

---

#### Step 2: Get Registration Detail
```
GET {{base_url}}/admin/registrations/detail/[REGISTRATION_ID]
Authorization: Bearer {{admin_token}}
```

---

#### Step 3: Update Registration Status
```
PATCH {{base_url}}/admin/registrations/[REGISTRATION_ID]/status
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "status": "COMPLETED",
  "notes": "Course completed with excellent performance"
}
```

---

#### Step 4: Get Payment Details
```
GET {{base_url}}/admin/registrations/[REGISTRATION_ID]/payment
Authorization: Bearer {{admin_token}}
```

---

#### Step 5: Issue Certificate
```
POST {{base_url}}/admin/registrations/[REGISTRATION_ID]/certificate
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "certificateUrl": "https://example.com/certs/AGI001.pdf",
  "certificateName": "Agile_Mastery_Certificate.pdf"
}
```

---

#### Step 6: Cancel User Registration
```
PATCH {{base_url}}/admin/registrations/[REGISTRATION_ID]/cancel
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "reason": "Administrative cancellation"
}
```

---

## ✅ Quick Checklist

- [ ] Admin can login
- [ ] Admin can create courses
- [ ] Admin can view all courses
- [ ] Admin can update courses
- [ ] Admin can activate/deactivate courses
- [ ] User can register
- [ ] User can login
- [ ] User can browse courses
- [ ] User can search courses
- [ ] User can register for course
- [ ] User can process payment
- [ ] User can submit review
- [ ] User can cancel registration
- [ ] Admin can view registrations
- [ ] Admin can issue certificates
- [ ] Admin can view dashboard stats

---

## 🔗 Sample Data IDs

After creating data, replace placeholders with actual IDs:

```
[COURSE_ID]        - ObjectId of created course
[REGISTRATION_ID]  - ObjectId of registration
[ADMIN_ID]         - ObjectId of admin
[USER_ID]          - ObjectId of participant
```

---

## 📊 Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - No/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |

---

## 💾 Import into Postman

Create a new Collection and add these requests:

1. Admin Auth (5 requests)
2. Admin Courses (7 requests)
3. Admin Registrations (6 requests)
4. User Auth (5 requests)
5. User Courses (5 requests)
6. User Registrations (7 requests)

**Total: 35 test requests**

---

## 🎯 Pro Tips

1. **Save tokens** as environment variables after login
2. **Use {{base_url}}** for easy endpoint switching
3. **Test in order** to get valid IDs for dependent requests
4. **Check console** in Postman to see detailed responses
5. **Use pre-request scripts** to automate token setting

---

## 🚀 Ready to Test?

Start your server:
```bash
npm run dev
```

Then import these requests into Postman and start testing!

Happy testing! 🎉
