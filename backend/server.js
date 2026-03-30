const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const app = express();
const port = 3001;

// Set working directory to backend
process.chdir(path.dirname(__filename));

// Import API handlers
const usersApi = require('./api/users/index.js');
const usersStatusApi = require('./api/users/status/index.js');
const usersIdApi = require('./api/users/[id]/index.js');

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  next();
});

// API Routes
app.all('/api/users', (req, res) => usersApi(req, res));
app.all('/api/users/status', (req, res) => usersStatusApi(req, res));
app.all('/api/users/:id', (req, res) => {
  req.url = req.url.replace('/api/users/', '/api/users/[id]/');
  usersIdApi(req, res);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'STI Archives API is running locally' });
});

app.listen(port, () => {
  console.log(`STI Archives API server running at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
  console.log(`Users API: http://localhost:${port}/api/users`);
});