// PublicFacingListing.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import './PublicFacingListing.css';

// Helper function to map property type values to readable text
const getPropertyTypeText = (value) => {
  const propertyTypes = {
    singleFamily: 'Single Family Home',
    condo: 'Condominium',
    townhouse: 'Townhouse',
    multiFamily: 'Multi-Family Home',
    land: 'Land',
    commercial: 'Commercial',
  };
  return propertyTypes[value] || 'Unknown Property Type';
};

const PublicFacingListing = () => {
  const { token } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/public/${token}`);
        setListing(response.data);
      } catch (error) {
        console.error('Error fetching listing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [token]);

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  if (!listing) {
    return <div className="error-message">Listing not found or is no longer public.</div>;
  }

  return (
    <div className="public-listing-container">
      <Header />
      <div className="public-listing-content">
        <div className="public-listing-grid">
          {/* Left Section */}
          <div className="left-section">
            <h1 className="listing-address">{listing.homeCharacteristics.address}</h1>
            <p className="listing-location">
              {listing.homeCharacteristics.city}, {listing.homeCharacteristics.state} {listing.homeCharacteristics.zip}
            </p>
            {listing.imagesUrls && listing.imagesUrls.length > 0 && (
              <div className="listing-image">
                <img src={listing.imagesUrls[0]} alt="Property" className="property-image" />
              </div>
            )}
            <div className="listing-details">
              <p><strong>Asking Price:</strong> ${listing.homeCharacteristics.price?.toLocaleString() || '-'}</p>
              <p><strong>Bedrooms:</strong> {listing.homeCharacteristics.beds}</p>
              <p><strong>Bathrooms:</strong> {listing.homeCharacteristics.baths}</p>
              <p><strong>Sq. Ft.:</strong> {listing.homeCharacteristics.squareFootage || '-'}</p>
              <p><strong>Lot Size:</strong> {listing.homeCharacteristics.lotSize || '-'}</p>
              <p><strong>Property Type:</strong> {getPropertyTypeText(listing.homeCharacteristics.propertyType)}</p>
              <p><strong>Year Built:</strong> {listing.homeCharacteristics.yearBuilt}</p>
            </div>
          </div>

          {/* Right Section */}
          <div className="signup-section">
            <h2>Request Property Information</h2>
            <p>Request access to the property information package, review disclosures and submit offers.</p>
            <form className="signup-form">
              <label>
                Role
                <select>
                  <option value="">I am a...</option>
                  <option value="buyer">Buyer</option>
                  <option value="agent">Agent</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Name
                <input type="text" placeholder="Enter your name..." />
              </label>
              <label>
                Email
                <input type="email" placeholder="Enter your email..." />
              </label>
              <button type="submit" className="request-info-button">Request Information</button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PublicFacingListing;
