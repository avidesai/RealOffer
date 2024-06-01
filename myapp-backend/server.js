require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected. We\'re live.'))
  .catch(err => console.log(err));

// Root route
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Existing Routes
const buyerListingsRouter = require('./routes/buyer_listings');
app.use('/buyer_listings', buyerListingsRouter);

const sellerListingsRouter = require('./routes/seller_listings');
app.use('/seller_listings', sellerListingsRouter);

const uploadRouter = require('./routes/upload');
app.use('/upload', uploadRouter);

// New Routes
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

const propertyListingsRouter = require('./routes/propertyListings');
app.use('/api/propertyListings', propertyListingsRouter);

const documentsRouter = require('./routes/documents');
app.use('/api/documents', documentsRouter);

const transactionsRouter = require('./routes/transactions');
app.use('/api/transactions', transactionsRouter);

const favoritesRouter = require('./routes/favorites');
app.use('/api/favorites', favoritesRouter);

const listingTemplatesRouter = require('./routes/listingTemplates');
app.use('/api/listingTemplates', listingTemplatesRouter);

// Server Configuration
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));