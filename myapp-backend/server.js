require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Optional: Specific CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000', // your frontend domain
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Enable credentials if needed
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected. We\'re live.'))
  .catch(err => console.log(err));

// Root route
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Route Imports
const usersRouter = require('./routes/users');
const propertyListingsRouter = require('./routes/propertyListings');
const buyerPackagesRouter = require('./routes/buyerPackages');
const documentsRouter = require('./routes/documents');
const transactionsRouter = require('./routes/transactions');
const listingTemplatesRouter = require('./routes/listingTemplates');
const viewersRouter = require('./routes/viewers');
const offersRouter = require('./routes/offers');

// Route Usage
app.use('/api/users', usersRouter);
app.use('/api/propertyListings', propertyListingsRouter);
app.use('/api/buyerPackages', buyerPackagesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/listingTemplates', listingTemplatesRouter);
app.use('/api/viewers', viewersRouter);
app.use('/api/offers', offersRouter);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Server Configuration
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
