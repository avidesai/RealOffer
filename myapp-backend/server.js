require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from your Vercel frontend domains or localhost during development
    const whitelist = [
      'http://localhost:3000', // Local development
      'https://real-offer-eight.vercel.app', // Production domain
      'https://real-offer-git-main-avidesais-projects.vercel.app', // Vercel preview domain (main branch)
      'https://real-offer-f3awpduaj-avidesais-projects.vercel.app', // Another Vercel preview domain
    ];

    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Enable credentials (cookies, authorization headers, etc.)
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected. We\'re live.'))
  .catch(err => console.log('MongoDB connection error:', err));

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

// Route Usage
app.use('/api/users', usersRouter);
app.use('/api/propertyListings', propertyListingsRouter);
app.use('/api/buyerPackages', buyerPackagesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/viewers', viewersRouter);
app.use('/api/offers', offersRouter);
app.use('/api/activities', activitiesRouter);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Server Configuration
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
