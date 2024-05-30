const mongoose = require('mongoose');
const BuyerListing = require('./models/Buyer_Listings');
const SellerListing = require('./models/Seller_Listings');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Make sure to load .env file

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const buyerListingsPath = path.join(__dirname, 'dummy_data', 'buyerListings.json');
const sellerListingsPath = path.join(__dirname, 'dummy_data', 'sellerListings.json');

const buyerListings = JSON.parse(fs.readFileSync(buyerListingsPath, 'utf-8'));
const sellerListings = JSON.parse(fs.readFileSync(sellerListingsPath, 'utf-8'));

const seedData = async () => {
  try {
    await BuyerListing.deleteMany();
    await SellerListing.deleteMany();
    await BuyerListing.insertMany(buyerListings);
    await SellerListing.insertMany(sellerListings);
    console.log('Data seeded');
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
  }
};

seedData();
