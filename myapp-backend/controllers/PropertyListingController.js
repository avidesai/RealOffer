const PropertyListing = require('../models/PropertyListing');

exports.getAllListings = async (req, res) => {
    try {
        const listings = await PropertyListing.find();
        res.status(200).json(listings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getListingById = async (req, res) => {
    try {
        const listing = await PropertyListing.findById(req.params.id);
        if (!listing) return res.status(404).json({ message: "Listing not found" });
        res.status(200).json(listing);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createListing = async (req, res) => {
    const newListing = new PropertyListing(req.body);
    try {
        const savedListing = await newListing.save();
        res.status(201).json(savedListing);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateListing = async (req, res) => {
    try {
        const updatedListing = await PropertyListing.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedListing);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteListing = async (req, res) => {
    try {
        await PropertyListing.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Listing deleted" });
    } catch (error) {
        res.status(404).json({ message: "Listing not found" });
    }
};
