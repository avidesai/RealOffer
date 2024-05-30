require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.get('/', (req, res) => {
  res.send('Hello World');
});

const buyerListingsRouter = require('./routes/buyer_listings');
app.use('/buyer_listings', buyerListingsRouter);

const sellerListingsRouter = require('./routes/seller_listings');
app.use('/seller_listings', sellerListingsRouter);

const uploadRouter = require('./routes/upload');
app.use('/upload', uploadRouter);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
