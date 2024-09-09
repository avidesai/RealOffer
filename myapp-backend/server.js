// server.js

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
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
    'https://real-offer-ja4izgjou-avidesais-projects.vercel.app'
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

app.set('trust proxy', 1); // trust first proxy

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // This ensures secure cookies in production
      httpOnly: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    },    
  })
);

// Middleware to log cookies
app.use((req, res, next) => {
  console.log('Cookies:', req.cookies); // Log the cookies sent with each request
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
