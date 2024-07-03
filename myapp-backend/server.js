// server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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
const usersRouter = require('./routes/users');
const uploadRouter = require('./routes/upload');
const propertyListingsRouter = require('./routes/propertyListings');
const buyerPackagesRouter = require('./routes/buyerPackages');  // Import the buyerPackages router
const documentsRouter = require('./routes/documents');
const transactionsRouter = require('./routes/transactions');
const favoritesRouter = require('./routes/favorites');
const listingTemplatesRouter = require('./routes/listingTemplates');

// Route Usage
app.use('/api/users', usersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/propertyListings', propertyListingsRouter);
app.use('/api/buyerPackages', buyerPackagesRouter);  // Use the buyerPackages route
app.use('/api/documents', documentsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/listingTemplates', listingTemplatesRouter);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Server Configuration
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

