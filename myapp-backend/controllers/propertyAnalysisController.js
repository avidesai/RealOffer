const axios = require('axios');
const PropertyListing = require('../models/PropertyListing');

// Get property valuation from RentCast API
const getPropertyValuation = async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Get property details from our database
    const property = await PropertyListing.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const { homeCharacteristics } = property;

    // Prepare address for RentCast API
    const address = `${homeCharacteristics.address}, ${homeCharacteristics.city}, ${homeCharacteristics.state} ${homeCharacteristics.zip}`;

    // Call RentCast API for property valuation with additional parameters
    const response = await axios.get('https://api.rentcast.io/v1/property-valuation', {
      params: {
        address: address,
        bedrooms: homeCharacteristics.beds,
        bathrooms: homeCharacteristics.baths,
        squareFootage: homeCharacteristics.squareFootage,
        yearBuilt: homeCharacteristics.yearBuilt,
        propertyType: homeCharacteristics.propertyType,
        lotSize: homeCharacteristics.lotSize
      },
      headers: {
        'X-Api-Key': process.env.RENTCAST_API_KEY
      }
    });

    // Format the response
    const valuation = {
      estimatedValue: response.data.estimatedValue,
      pricePerSqFt: response.data.pricePerSqFt,
      lastSalePrice: response.data.lastSalePrice,
      lastSaleDate: response.data.lastSaleDate,
      confidenceScore: response.data.confidenceScore,
      // Add additional valuation metrics if available
      marketValue: response.data.marketValue,
      rentEstimate: response.data.rentEstimate,
      priceHistory: response.data.priceHistory
    };

    res.json(valuation);
  } catch (error) {
    console.error('Error fetching property valuation:', error);
    res.status(500).json({ message: 'Error fetching property valuation' });
  }
};

// Get comparable properties from RentCast API
const getComparableProperties = async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Get property details from our database
    const property = await PropertyListing.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const { homeCharacteristics } = property;

    // Prepare address for RentCast API
    const address = `${homeCharacteristics.address}, ${homeCharacteristics.city}, ${homeCharacteristics.state} ${homeCharacteristics.zip}`;

    // Call RentCast API for comparable properties with additional parameters
    const response = await axios.get('https://api.rentcast.io/v1/property-comps', {
      params: {
        address: address,
        limit: 5, // Get 5 comparable properties
        bedrooms: homeCharacteristics.beds,
        bathrooms: homeCharacteristics.baths,
        squareFootage: homeCharacteristics.squareFootage,
        yearBuilt: homeCharacteristics.yearBuilt,
        propertyType: homeCharacteristics.propertyType,
        lotSize: homeCharacteristics.lotSize,
        // Add search radius in miles (default is usually 1 mile)
        radius: 2,
        // Add price range parameters
        minPrice: Math.round(homeCharacteristics.price * 0.8), // 20% below
        maxPrice: Math.round(homeCharacteristics.price * 1.2)  // 20% above
      },
      headers: {
        'X-Api-Key': process.env.RENTCAST_API_KEY
      }
    });

    // Format the response with additional comparison metrics
    const comps = response.data.map(comp => ({
      address: comp.address,
      price: comp.price,
      beds: comp.beds,
      baths: comp.baths,
      sqft: comp.sqft,
      yearBuilt: comp.yearBuilt,
      distance: comp.distance,
      imageUrl: comp.imageUrl,
      // Add additional comparison metrics
      pricePerSqFt: comp.pricePerSqFt,
      lastSaleDate: comp.lastSaleDate,
      lastSalePrice: comp.lastSalePrice,
      propertyType: comp.propertyType,
      lotSize: comp.lotSize,
      // Add price difference from subject property
      priceDifference: comp.price - homeCharacteristics.price,
      priceDifferencePercent: ((comp.price - homeCharacteristics.price) / homeCharacteristics.price * 100).toFixed(1)
    }));

    res.json({ 
      comps,
      subjectProperty: {
        address: address,
        price: homeCharacteristics.price,
        beds: homeCharacteristics.beds,
        baths: homeCharacteristics.baths,
        sqft: homeCharacteristics.squareFootage,
        yearBuilt: homeCharacteristics.yearBuilt,
        propertyType: homeCharacteristics.propertyType,
        lotSize: homeCharacteristics.lotSize
      }
    });
  } catch (error) {
    console.error('Error fetching comparable properties:', error);
    res.status(500).json({ message: 'Error fetching comparable properties' });
  }
};

module.exports = {
  getPropertyValuation,
  getComparableProperties
}; 