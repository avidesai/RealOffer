// server.js

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default; // Updated to use connect-redis
const { createClient } = require('redis'); // Import createClient from redis
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://www.realoffer.io',
    'https://realoffer.io',
    'https://real-offer-eight.vercel.app',
    'https://real-offer-ja4izgjou-avidesais-projects.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Preflight response handling for all routes
app.options('*', cors(corsOptions));

// JSON body parsing middleware
app.use(express.json());

// Add cookie-parser middleware
app.use(cookieParser());

app.set('trust proxy', 1); // trust first proxy

// Create a Redis client
let redisClient = createClient({
  url: process.env.REDIS_URL, // Ensure this is set in your .env file
});

// Handle Redis client errors
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
redisClient.connect().catch(console.error);

// Create a Redis store
let redisStore = new RedisStore({
  client: redisClient,
  prefix: 'myapp:', // Optional, customize as needed
});

// Session configuration
app.use(
  session({
    store: redisStore, // Use Redis store instead of Mongo store
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Important if behind a proxy like Render
    cookie: {
      secure: true, // Must be true if SameSite=None
      httpOnly: true,
      sameSite: 'None', // 'None' allows cookies to be sent in cross-site requests
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// Middleware to log cookies and session details
app.use((req, res, next) => {
  console.log('--- Request Start ---');
  console.log('Request URL:', req.originalUrl);
  console.log('Request Method:', req.method);
  console.log('Cookies:', req.cookies); // Log the cookies sent with each request
  console.log('Session ID:', req.sessionID); // Log session ID for each request
  console.log('Session Data:', req.session); // Log session data
  res.on('finish', () => {
    console.log('Response Status Code:', res.statusCode);
    console.log('Response Headers:', res.getHeaders()); // Log headers including cookies
    console.log('--- Request End ---\n');
  });
  next();
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected. We're live."))
  .catch((err) => console.log('MongoDB connection error:', err));

// Root route
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Test route for debugging session persistence
app.get('/test-session', (req, res) => {
  if (!req.session.testValue) {
    req.session.testValue = 'Session is working!';
  } else {
    console.log('Session:', req.session);
  }
  res.json({ sessionValue: req.session.testValue });
});

// Route Imports
const usersRouter = require('./routes/users');
const propertyListingsRouter = require('./routes/propertyListings');
const buyerPackagesRouter = require('./routes/buyerPackages');
const documentsRouter = require('./routes/documents');
const viewersRouter = require('./routes/viewers');
const offersRouter = require('./routes/offers');
const activitiesRouter = require('./routes/activities');
const messagesRouter = require('./routes/messages');
const docusignRouter = require('./routes/docusign');

// Route Usage
app.use('/api/users', usersRouter);
app.use('/api/propertyListings', propertyListingsRouter);
app.use('/api/buyerPackages', buyerPackagesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/viewers', viewersRouter);
app.use('/api/offers', offersRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/docusign', docusignRouter);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Server Configuration
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
