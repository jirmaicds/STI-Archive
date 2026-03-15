# STI Frontend

A responsive frontend for the STI web application using HTML, CSS, and JavaScript. Configured for deployment to Vercel with API backend integration.

## Features

- Responsive design for mobile, tablet, and desktop
- User authentication and authorization
- Modern UI components
- API integration with backend
- File upload functionality
- Admin dashboard
- User management system

## Prerequisites

- Node.js 18+ installed (for local development)
- Vercel account (for deployment)
- Backend deployed to Vercel (see [`backend/README.md`](../backend/README.md))

---

## Configuration

### API Configuration

The frontend is pre-configured to work with the Vercel-deployed backend. By default, it uses relative URLs which will work automatically when deployed to Vercel.

**For custom API URLs**, edit [`config/app.js`](config/app.js):

```javascript
const config = {
  api: {
    // Use relative path (recommended for Vercel monorepo)
    // OR use absolute URL: 'https://your-backend.vercel.app'
    baseUrl: '',  // Empty = relative URLs
    // ... rest of config
  }
};
```

### Environment Variables (Optional)

Create a `.env` file in the `frontend` directory:
```
VITE_API_URL=https://your-backend.vercel.app
```

---

## Local Development

### Install Dependencies

```bash
cd frontend
npm install
```

### Start Development Server

```bash
npm start
```

The frontend will be available at `http://localhost:3000`

### Running with Backend

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd frontend
npm start
```

---

## Deployment to Vercel

### Option A: Deploy Frontend Separately

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
6. (Optional) Add environment variable: `VITE_API_URL=https://your-backend.vercel.app`
7. Click "Deploy"

### Option B: Deploy Frontend with Backend (Monorepo)

If your repository has both frontend and backend in the same repo:

1. Create two separate Vercel projects:
   - One for `backend` (API functions)
   - One for `frontend` (static site)
2. In the frontend project settings, add the backend URL:
   - Environment Variable: `VITE_API_URL`
   - Value: `https://your-backend-project.vercel.app`

### Custom Domain

To use a custom domain:

1. Go to Vercel project Settings → Domains
2. Add your custom domain
3. Update your DNS records as instructed by Vercel

---

## Project Structure

```
frontend/
├── assets/
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript files
│   └── images/        # Image assets
├── config/            # Configuration files
│   └── app.js         # App configuration
├── services/          # API services
│   ├── ApiService.js  # API communication
│   └── ActivityService.js
├── utils/             # Utility functions
│   └── AuthService.js # Authentication utilities
├── package.json
├── vercel.json        # Vercel configuration
└── README.md          # This file
```

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Troubleshooting

### API Not Connecting

1. Verify the backend is deployed and running
2. Check the browser console for CORS errors
3. Ensure the `baseUrl` in `config/app.js` is correct

### Static Assets Not Loading

1. Verify the `assets` folder is included in deployment
2. Check the file paths in HTML files
3. Review Vercel deployment logs

### Authentication Issues

1. Clear browser localStorage
2. Check that the backend is properly configured with Supabase
3. Verify JWT_SECRET is set in backend environment variables

---

## License

MIT
