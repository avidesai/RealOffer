require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true, 
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected. We\'re live.'))
.catch(err => console.log(err));

// Root route
app.get('/', (req, res) => {
    res.send('Hello World');
});

// Route Imports
const buyerListingsRouter = require('./routes/buyer_listings');
const sellerListingsRouter = require('./routes/seller_listings');
const uploadRouter = require('./routes/upload');
const usersRouter = require('./routes/users');
const propertyListingsRouter = require('./routes/propertyListings');
const documentsRouter = require('./routes/documents');
const transactionsRouter = require('./routes/transactions');
const favoritesRouter = require('./routes/favorites');
const listingTemplatesRouter = require('./routes/listingTemplates');

// Route Usage
app.use('/buyer_listings', buyerListingsRouter);
app.use('/seller_listings', sellerListingsRouter);
app.use('/upload', uploadRouter);
app.use('/api/users', usersRouter);
app.use('/api/propertyListings', propertyListingsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/listingTemplates', listingTemplatesRouter);

// Server Configuration
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
