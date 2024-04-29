require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('./models/Listing'); // adjust the path as necessary

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const seedListings = [
  {
    address: '93 Main Street',
    city: 'Louisville',
    state: 'KY',
    zip: '40208',
    imageUrl: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    agents: ['https://ssl.cdn-redfin.com/system_files/images/18888/640x460/6_78.jpg'], // Replace with the URL to the agent's image
    isNew: false,
  },
  // Additional listings...
];

const seedDB = async () => {
  await Listing.deleteMany({});
  await Listing.insertMany(seedListings);
};

seedDB().then(() => {
  console.log("Database seeded");
  mongoose.connection.close();
});
