const axios = require('axios');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');

// Helper function to check if analysis data is stale (older than 14 days)
const isAnalysisStale = (lastUpdated) => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  return lastUpdated < fourteenDaysAgo;
};

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

// Helper function to fetch fresh data from RentCast
const fetchFreshAnalysisData = async (property) => {
  const { homeCharacteristics } = property;
  const address = `${homeCharacteristics.address}, ${homeCharacteristics.city}, ${homeCharacteristics.state} ${homeCharacteristics.zip}`;

  // Fetch all data in parallel
  const [valuationResponse, rentResponse] = await Promise.all([
    axios.get('https://api.rentcast.io/v1/avm/value', {
      params: {
        address,
        bedrooms: homeCharacteristics.beds,
        bathrooms: homeCharacteristics.baths,
        squareFootage: homeCharacteristics.squareFootage,
        yearBuilt: homeCharacteristics.yearBuilt,
        propertyType: mapPropertyType(homeCharacteristics.propertyType),
        lotSize: homeCharacteristics.lotSize,
        maxRadius: 2,
        daysOld: 180,
        compCount: 10
      },
      headers: {
        'X-Api-Key': process.env.RENTCAST_API_KEY
      }
    }),
    axios.get('https://api.rentcast.io/v1/avm/rent/long-term', {
      params: {
        address,
        bedrooms: homeCharacteristics.beds,
        bathrooms: homeCharacteristics.baths,
        squareFootage: homeCharacteristics.squareFootage,
        yearBuilt: homeCharacteristics.yearBuilt,
        propertyType: mapPropertyType(homeCharacteristics.propertyType),
        lotSize: homeCharacteristics.lotSize,
        maxRadius: 5,
        daysOld: 270,
        compCount: 20
      },
      headers: {
        'X-Api-Key': process.env.RENTCAST_API_KEY
      }
    })
  ]);

  // Format the comparables with additional comparison metrics
  const comparables = (valuationResponse.data.comparables || []).map(comp => ({
    ...comp,
    pricePerSqFt: comp.squareFootage ? Math.round(comp.price / comp.squareFootage) : null,
    priceDifference: comp.price - homeCharacteristics.price,
    priceDifferencePercent: homeCharacteristics.price ? 
      ((comp.price - homeCharacteristics.price) / homeCharacteristics.price * 100).toFixed(1) : null,
    // Ensure we have all required fields
    bedrooms: comp.bedrooms,
    bathrooms: comp.bathrooms,
    squareFootage: comp.squareFootage,
    lotSize: comp.lotSize,
    yearBuilt: comp.yearBuilt,
    price: comp.price,
    distance: comp.distance,
    correlation: comp.correlation,
    listedDate: comp.listedDate,
    removedDate: comp.removedDate,
    daysOnMarket: comp.daysOnMarket
  }));

  // Sort rental comparables by correlation
  const rentalComps = (rentResponse.data.comparables || [])
    .sort((a, b) => (b.correlation || 0) - (a.correlation || 0))
    .slice(0, 10)
    .map(comp => ({
      address: comp.formattedAddress,
      rent: comp.rent,
      correlation: comp.correlation
    }));

  return {
    valuation: {
      estimatedValue: valuationResponse.data.estimatedValue,
      priceRangeLow: valuationResponse.data.priceRangeLow,
      priceRangeHigh: valuationResponse.data.priceRangeHigh,
      lastUpdated: new Date(),
      comparables
    },
    rentEstimate: {
      rent: rentResponse.data.rent,
      rentRangeLow: rentResponse.data.rentRangeLow,
      rentRangeHigh: rentResponse.data.rentRangeHigh,
      comparables: rentalComps
    },
    subjectProperty: {
      address,
      price: homeCharacteristics.price,
      beds: homeCharacteristics.beds,
      baths: homeCharacteristics.baths,
      sqft: homeCharacteristics.squareFootage,
      lotSize: homeCharacteristics.lotSize,
      yearBuilt: homeCharacteristics.yearBuilt,
      propertyType: mapPropertyType(homeCharacteristics.propertyType)
    }
  };
};

// Get property analysis (valuation, rent, and comps)
exports.getPropertyAnalysis = async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Get property details
    const property = await PropertyListing.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check for existing analysis
    let analysis = await PropertyAnalysis.findOne({ propertyId });

    // If no analysis exists or it's stale, fetch fresh data
    if (!analysis || isAnalysisStale(analysis.lastUpdated)) {
      const freshData = await fetchFreshAnalysisData(property);
      
      // Create or update analysis document
      analysis = await PropertyAnalysis.findOneAndUpdate(
        { propertyId },
        {
          ...freshData,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
    }

    res.json({
      valuation: analysis.valuation,
      rentEstimate: analysis.rentEstimate,
      subjectProperty: analysis.subjectProperty
    });
  } catch (error) {
    console.error('Error fetching property analysis:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Error fetching property analysis',
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

    // Sort comparables by correlation (most relevant first)
    const rentalComps = (response.data.comparables || [])
      .sort((a, b) => (b.correlation || 0) - (a.correlation || 0))
      .slice(0, 10) // Limit to top 10 rental comparables
      .map(comp => ({
        address: comp.formattedAddress,
        rent: comp.rent,
        correlation: comp.correlation
      }));

    // Format the response according to RentCast API structure
    const rentEstimate = {
      rent: response.data.rent,
      rentRangeLow: response.data.rentRangeLow,
      rentRangeHigh: response.data.rentRangeHigh,
      latitude: response.data.latitude,
      longitude: response.data.longitude,
      comparables: response.data.comparables || [],
      rentalComps: rentalComps
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