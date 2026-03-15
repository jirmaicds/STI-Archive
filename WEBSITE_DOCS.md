# STI Archives Website Documentation

## Overview

**STI Archives** is a research paper and document management system for STI College Calamba. It allows students to browse, upload, and download research papers and documents.

## Tech Stack

- **Frontend**: Static HTML/CSS/JS (hosted on Vercel)
- **Backend**: Node.js Serverless Functions (Vercel)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (file uploads, PDFs)

## Website Pages

| Page | Description |
|------|-------------|
| `index.html` | Home/Landing page |
| `Homepage.html` | Main homepage with carousel |
| `library.html` | Document library |
| `admin.html` | Admin dashboard |
| `coadmin.html` | Co-admin dashboard |
| `subadmin.html` | Sub-admin dashboard |
| `pfp.html` | Profile page |
| `myspace.html` | User personal space |
| `pending.html` | Pending approvals |
| `about.html` | About page |
| `terms.html` | Terms of service |
| `privacy.html` | Privacy policy |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/profile` - Get/update profile
- `POST /api/auth/accept-user` - Accept user registration

### Users
- `GET /api/users` - Get all users
- `POST /api/users/status` - Update user status (accept/reject/ban)

### Articles/Research Papers
- `GET /api/articles` - Get all articles
- `POST /api/articles` - Create new article (admin)
- `POST /api/articles/upload` - Upload article PDF

### User Uploads
- `GET /api/admin/user-uploads` - Get all uploads (admin)
- `PUT /api/admin/user-upload/[id]` - Update upload status

### Site Settings
- `GET /api/site-settings` - Get site settings
- `GET /get_site_settings` - Legacy endpoint

### Carousel
- `GET /api/carousel` - Get carousel items

### Activity Logs
- `GET /api/activity/logs` - Get activity logs

### Health Check
- `GET /api/health` - Check API health

## Database Tables (Supabase)

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `articles` | Research papers |
| `user_uploads` | User file uploads |
| `carousel` | Homepage carousel items |
| `activity_logs` | Admin activity logs |
| `site_settings` | Site configuration |
| `user_preferences` | User PDF viewer preferences |

## Storage Buckets (Supabase)

| Bucket | Purpose |
|--------|---------|
| `articles` | Research paper PDFs |
| `uploads` | User file uploads |
| `Studies` | Studies/Research folder |

## Environment Variables (Vercel)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
```

## User Roles

| Role | Permissions |
|------|-------------|
| `pending` | Awaiting approval |
| `user` | Regular user |
| `subadmin` | Limited admin |
| `coadmin` | Content moderator |
| `admin` | Full admin |

## Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel
4. Run SQL schema in Supabase
5. Deploy!

## Features

- User registration and authentication
- Admin dashboard for managing users
- Document library with search/filter
- PDF upload and viewing
- Carousel management
- Activity logging
- User status management (accept/reject/ban)
