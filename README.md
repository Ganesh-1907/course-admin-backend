# 🚀 Course Management Backend Setup

Follow these exact steps to set up the backend with PostgreSQL and Drizzle ORM.

---

## 1. Environment Configuration

Create a `.env` file in the root directory and paste the following content:

```env
# Database Connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/course_management

# Server Configuration
PORT=5000
NODE_ENV=development

# Auth Secrets
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=7d

# Frontend Connection
CORS_ORIGIN=http://localhost:5173
```

---

## 2. Initial Database Setup

Run these commands in order to get the project running with a fresh database:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Push Schema**: (Creates tables in your PostgreSQL database)
    ```bash
    npm run drizzle:migrate
    ```

3.  **Seed All Data**: (Creates Admins, 160+ Courses, 320+ Schedules, and Registrations)
    ```bash
    npm run seed:all
    ```

4.  **Start Server**:
    ```bash
    npm run dev
    ```

---

## 🔄 Schema Evolution & Synchronization

### A. Updating Database from Code
If you modify `src/db/schema.ts`, run this to update the database tables:
```bash
npm run drizzle:migrate
```

### B. Updating Code from Database
If you modified the database structure manually (e.g., using a SQL client or Drizzle Studio) and want to update your `schema.ts` file automatically:
```bash
npm run drizzle:generate
```
*(This will pull the current database structure into your local types)*

### C. Viewing Data
To explore your data in a browser UI:
```bash
npm run drizzle:studio
```
