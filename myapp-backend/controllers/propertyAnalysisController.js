const axios = require('axios');
const PropertyListing = require('../models/PropertyListing');

// Helper function to map property types to RentCast API expected values
const mapPropertyType = (propertyType) => {
  if (!propertyType) return 'Single Family';
  
  const type = propertyType.toLowerCase();
  
  const mappings = {
    'single family': 'Single Family',
    'single-family': 'Single Family',
    'house': 'Single Family',
    'detached': 'Single Family',
    'condo': 'Condo',
    'condominium': 'Condo',
    'townhouse': 'Townhouse',
    'townhome': 'Townhouse',
    'manufactured': 'Manufactured',
    'mobile': 'Manufactured',
    'multi-family': 'Multi-Family',
    'multifamily': 'Multi-Family',
    'duplex': 'Multi-Family',
    'triplex': 'Multi-Family',
    'fourplex': 'Multi-Family',
    'apartment': 'Apartment',
    'apartments': 'Apartment'
  };
  
  return mappings[type] || 'Single Family';
};

// Get property valuation from RentCast API
exports.getPropertyValuation = async (req, res) => {
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

    // Call RentCast API for property value estimate
    const response = await axios.get('https://api.rentcast.io/v1/avm/value', {
      params: {
        address: address,
        bedrooms: homeCharacteristics.beds,
        bathrooms: homeCharacteristics.baths,
        squareFootage: homeCharacteristics.squareFootage,
        yearBuilt: homeCharacteristics.yearBuilt,
        propertyType: mapPropertyType(homeCharacteristics.propertyType),
        lotSize: homeCharacteristics.lotSize,
        // Optional parameters for better accuracy
        maxRadius: 5, // 5 miles radius
        daysOld: 270, // Look back 270 days
        compCount: 20 // Use up to 20 comparables
      },
      headers: {
        'X-Api-Key': process.env.RENTCAST_API_KEY
      }
    });

    // Format the response according to RentCast API structure
    const valuation = {
      estimatedValue: response.data.price,
      priceRangeLow: response.data.priceRangeLow,
      priceRangeHigh: response.data.priceRangeHigh,
      pricePerSqFt: response.data.price ? Math.round(response.data.price / homeCharacteristics.squareFootage) : null,
      latitude: response.data.latitude,
      longitude: response.data.longitude,
      comparables: response.data.comparables || []
    };

    res.json(valuation);
  } catch (error) {
    console.error('Error fetching property valuation:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Error fetching property valuation',
      error: error.response?.data?.message || error.message
    });
  }
};

// Get comparable properties from RentCast API (using value estimate endpoint which includes comparables)
exports.getComparableProperties = async (req, res) => {
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

    // Call RentCast API for property value estimate (which includes comparables)
    const response = await axios.get('https://api.rentcast.io/v1/avm/value', {
      params: {
        address: address,
        bedrooms: homeCharacteristics.beds,
        bathrooms: homeCharacteristics.baths,
        squareFootage: homeCharacteristics.squareFootage,
        yearBuilt: homeCharacteristics.yearBuilt,
        propertyType: mapPropertyType(homeCharacteristics.propertyType),
        lotSize: homeCharacteristics.lotSize,
        // Optional parameters for better accuracy
        maxRadius: 2, // Smaller radius for more local comps
        daysOld: 180, // More recent comps
        compCount: 10 // Focus on best comparables
      },
      headers: {
        'X-Api-Key': process.env.RENTCAST_API_KEY
      }
    });

    // Format the comparables with additional comparison metrics
    const comps = (response.data.comparables || []).map(comp => ({
      id: comp.id,
      formattedAddress: comp.formattedAddress,
      address: comp.formattedAddress,
      price: comp.price,
      beds: comp.bedrooms,
      baths: comp.bathrooms,
      sqft: comp.squareFootage,
      yearBuilt: comp.yearBuilt,
      distance: comp.distance,
      propertyType: comp.propertyType,
      lotSize: comp.lotSize,
      // Additional fields from RentCast API
      pricePerSqFt: comp.squareFootage ? Math.round(comp.price / comp.squareFootage) : null,
      listingType: comp.listingType,
      listedDate: comp.listedDate,
      removedDate: comp.removedDate,
      daysOnMarket: comp.daysOnMarket,
      daysOld: comp.daysOld,
      correlation: comp.correlation,
      // Add price difference from subject property
      priceDifference: comp.price - homeCharacteristics.price,
      priceDifferencePercent: homeCharacteristics.price ? 
        ((comp.price - homeCharacteristics.price) / homeCharacteristics.price * 100).toFixed(1) : null
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
        propertyType: mapPropertyType(homeCharacteristics.propertyType),
        lotSize: homeCharacteristics.lotSize
      }
    });
  } catch (error) {
    console.error('Error fetching comparable properties:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Error fetching comparable properties',
      error: error.response?.data?.message || error.message
    });
  }
};

// Get rent estimate from RentCast API
exports.getRentEstimate = async (req, res) => {
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

    // Call RentCast API for rent estimate
    const response = await axios.get('https://api.rentcast.io/v1/avm/rent/long-term', {
      params: {
        address: address,
        bedrooms: homeCharacteristics.beds,
        bathrooms: homeCharacteristics.baths,
        squareFootage: homeCharacteristics.squareFootage,
        yearBuilt: homeCharacteristics.yearBuilt,
        propertyType: mapPropertyType(homeCharacteristics.propertyType),
        lotSize: homeCharacteristics.lotSize,
        // Optional parameters for better accuracy
        maxRadius: 5, // 5 miles radius
        daysOld: 270, // Look back 270 days
        compCount: 20 // Use up to 20 comparables
      },
      headers: {
        'X-Api-Key': process.env.RENTCAST_API_KEY
      }
    });

    // Format the response according to RentCast API structure
    const rentEstimate = {
      rent: response.data.rent,
      rentRangeLow: response.data.rentRangeLow,
      rentRangeHigh: response.data.rentRangeHigh,
      latitude: response.data.latitude,
      longitude: response.data.longitude,
      comparables: response.data.comparables || []
    };

    res.json(rentEstimate);
  } catch (error) {
    console.error('Error fetching rent estimate:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Error fetching rent estimate',
      error: error.response?.data?.message || error.message
    });
  }
}; 