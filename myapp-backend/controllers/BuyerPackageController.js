// BuyerPackageController.js

const BuyerPackage = require('../models/BuyerPackage');
const PropertyListing = require('../models/PropertyListing');
const User = require('../models/User');

// Create BuyerPackage upon accessing a public listing
exports.createPackageForBuyer = async (req, res) => {
  const { propertyListingId } = req.body;

  try {
    // Ensure the property listing exists
    const listing = await PropertyListing.findById(propertyListingId);
    if (!listing) {
      return res.status(404).json({ message: "Property listing not found" });
    }

    // Prevent duplicate packages for the same buyer and property
    const existingPackage = await BuyerPackage.findOne({ propertyListingId, buyerId: req.user.id });
    if (existingPackage) {
      return res.status(400).json({ message: "Buyer package already exists for this property" });
    }

    // Create new BuyerPackage
    const buyerPackage = new BuyerPackage({
      propertyListingId,
      buyerId: req.user.id,
    });

    const savedPackage = await buyerPackage.save();

    // Add BuyerPackage to the user's collection
    const user = await User.findById(req.user.id);
    user.buyerPackages.push(savedPackage._id);
    await user.save();

    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all BuyerPackages for the logged-in buyer
exports.getAllBuyerPackages = async (req, res) => {
  try {
    const packages = await BuyerPackage.find({ buyerId: req.user.id }).populate('propertyListingId');
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single BuyerPackage by ID
exports.getBuyerPackageById = async (req, res) => {
  try {
    const package = await BuyerPackage.findOne({ _id: req.params.id, buyerId: req.user.id }).populate([
      'documents',
      'activity',
      'messages',
      'offers',
      'propertyListingId',
    ]);
    if (!package) {
      return res.status(404).json({ message: "Buyer package not found" });
    }
    res.status(200).json(package);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add documents to BuyerPackage
exports.addDocumentsToBuyerPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;

    const buyerPackage = await BuyerPackage.findOne({ _id: id, buyerId: req.user.id });
    if (!buyerPackage) {
      return res.status(404).json({ message: "Buyer package not found" });
    }

    const documents = files.map((file) => ({
      title: file.originalname,
      url: file.location,
    }));

    buyerPackage.documents.push(...documents);
    await buyerPackage.save();

    res.status(201).json({ message: "Documents added", documents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
