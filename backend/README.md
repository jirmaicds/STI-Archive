# STI Archives Backend

Node.js backend configured for Vercel serverless deployment with Supabase (PostgreSQL) database.

## Features

- **Authentication**: JWT-based auth with Supabase integration
- **User Management**: Register, login, profile, password reset
- **Activity Logging**: Admin action logging system
- **Email Service**: Password reset and account activation emails
- **Articles Management**: Research paper CRUD operations
- **Carousel Management**: Homepage carousel management
- **Documents**: User document storage and management
- **User Uploads**: Research paper submission system

## Prerequisites

- Node.js 18+ installed
- Vercel account
- Supabase account (free tier works)

---

## Part 1: Set Up Supabase

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the details:
   - **Name**: `sti-archives` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose one closest to your users
4. Click "Create new project" and wait for it to initialize

### Step 2: Run the Database Schema

1. In the Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New query"
3. Open the [`schema.sql`](schema.sql) file in this directory
4. Copy all the SQL content and paste it into the SQL Editor
5. Click "Run" to execute the schema

**Important**: The schema creates a sample admin user:
- **Email**: `admin@stiarchives.edu`
- **Password**: `admin123` (CHANGE THIS IN PRODUCTION!)

### Step 3: Get Your API Credentials

1. Go to "Project Settings" (gear icon) → "API"
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - **KEEP SECRET**)

---

## Part 2: Configure Environment Variables

### For Local Development

1. Copy the example environment file:
```bash
copy .env.example .env.local
```

2. Edit `.env.local` and fill in your values:
```env
# Supabase Configuration (from Step 3 above)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT Configuration (generate a secure random string for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Gmail SMTP - use App Password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Site URL (your Vercel deployment URL)
SITE_URL=http://localhost:3000
```

**Note**: For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833):
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Search for "App Passwords" and create one

### For Vercel Deployment

Add these environment variables in your Vercel project dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `SITE_URL` (will be auto-set by Vercel)

---

## Part 3: Install and Run Locally

### Install Dependencies

```bash
cd backend
npm install
```

### Run Locally

```bash
npm run dev
```

This starts the Vercel development server at `http://localhost:3000`.

### Test the API

```bash
# Health check
curl http://localhost:3000/api/health

# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","fullname":"Test User"}'
```

---

## Part 4: Deploy to Vercel

### Option A: Deploy from GitHub (Recommended)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `backend` (or keep root if monorepo)
6. Add the environment variables in the "Environment Variables" section
7. Click "Deploy"

### Option B: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd backend
vercel --prod
```

Follow the prompts to configure your deployment.

---

## Part 5: Frontend Configuration

The frontend is a static HTML/CSS/JS application that needs to be configured to communicate with your backend API.

### Option A: Deploy Frontend Separately

1. Create a new Vercel project for the frontend
2. Select the `frontend` directory
3. Vercel will automatically detect it as a static site
4. Add environment variable: `VITE_API_URL=https://your-backend.vercel.app`
5. Deploy

### Option B: Deploy Frontend with Backend (Monorepo)

If deploying both from the same repository, update the frontend configuration:

1. Edit `frontend/config/app.js`:
```javascript
const config = {
  api: {
    baseUrl: 'https://your-backend-project.vercel.app',  // Your backend URL
    // ... rest of config
  }
};
```

2. Or set environment variable `VITE_API_URL` in Vercel

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/profile | Get user profile |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/activate | Activate account |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset password with code |
| POST | /api/auth/verify-reset-code | Verify reset code |
| POST | /api/auth/approve-user | Approve/reject/ban user |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | Get all users (admin) |
| GET | /api/users/:id | Get user by ID |

### Articles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/articles | Get all articles |
| GET | /api/articles/:id | Get article by ID |
| POST | /api/articles | Create article (admin) |
| PUT | /api/articles/:id | Update article (admin) |
| DELETE | /api/articles/:id | Delete article (admin) |

### Carousel

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/carousel | Get all carousel items |
| GET | /api/carousel/:id | Get carousel item by ID |
| POST | /api/carousel | Create carousel item (admin) |
| PUT | /api/carousel/:id | Update carousel item (admin) |
| DELETE | /api/carousel/:id | Delete carousel item (admin) |

### Activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/activity/logs | Get activity logs |
| GET | /api/activity/count | Get activity count |
| POST | /api/activity/log | Log activity (admin) |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/documents | Get all documents |
| GET | /api/documents/:id | Get document by ID |
| POST | /api/documents | Create document |
| PUT | /api/documents/:id | Update document |
| DELETE | /api/documents/:id | Delete document |

### User Uploads

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/user/upload | Upload research paper |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |

---

## User Roles

- `admin` - Full system access
- `coadmin` - Administrative privileges
- `subadmin` - Limited admin access
- `user` - Regular verified user
- `pending` - Registered but not activated
- `rejected` - Registration rejected
- `banned` - Account suspended

---

## Project Structure

```
backend/
├── api/                    # Vercel API routes
│   ├── auth/               # Authentication endpoints
│   ├── activity/          # Activity logging endpoints
│   ├── users/             # User management endpoints
│   ├── articles/          # Article management endpoints
│   ├── carousel/          # Carousel management endpoints
│   ├── documents/         # Document management endpoints
│   └── user/              # User-specific endpoints
├── config/                 # Configuration
├── services/               # Business logic services
│   ├── supabase.js         # Supabase client
│   └── EmailService.js     # Email handling
├── package.json
├── vercel.json             # Vercel configuration
├── schema.sql              # Database schema
├── .env.example            # Environment template
└── README.md               # This file
```

---

## Troubleshooting

### CORS Errors

If you encounter CORS errors, ensure the `SITE_URL` environment variable matches your frontend URL exactly.

### Supabase Connection Issues

1. Verify your `SUPABASE_URL` is correct
2. Check that your `SUPABASE_SERVICE_KEY` has the right permissions
3. Ensure Row Level Security policies are configured correctly

### Email Not Working

1. For Gmail, make sure you're using an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
2. Check that `EMAIL_USER` and `EMAIL_PASS` are correct

### Deployment Issues

1. Make sure your Node.js version is 18+ in `package.json`
2. Check the Vercel function logs in the dashboard
3. Ensure all required environment variables are set

---

## Development Mode

If Supabase is not configured, the backend will log a warning but may not function properly. Always ensure valid Supabase credentials for production use.

---

## License

MIT
