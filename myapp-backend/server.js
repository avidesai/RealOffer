// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = [
      'http://localhost:3000',
      'https://realoffer.io',
      'https://www.realoffer.io',
      'https://real-offer-eight.vercel.app',
      'https://real-offer-ja4izgjou-avidesais-projects.vercel.app',
    ];

    // Allow if origin is in the whitelist or it's undefined (e.g., local requests like curl)
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`Blocked by CORS: ${origin}`); // Log blocked origin for debugging
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow credentials (cookies, headers) to be sent
  optionsSuccessStatus: 204, // For legacy browser support
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Preflight response handling for all routes
app.options('*', cors(corsOptions));

// JSON body parsing middleware
app.use(express.json());

// Session middleware configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'mysecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Secure cookies in production
      httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
      sameSite: 'none', // Necessary for cross-site requests
      maxAge: 24 * 60 * 60 * 1000, // 1-day expiration for session cookies
    },
  })
);

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
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Server Configuration
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
