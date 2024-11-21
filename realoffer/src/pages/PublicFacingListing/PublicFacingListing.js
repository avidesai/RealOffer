// PublicFacingListing.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './PublicFacingListing.css';

const PublicFacingListing = () => {
  const { token } = useParams(); // Assuming the URL uses a parameter like '/listings/public/:token'
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
    return <div className="loading-spinner">Loading...</div>;
  }

  if (!listing) {
    return <div className="error-message">Listing not found or is no longer public.</div>;
  }

  return (
    <>
      <Header />
      <main className="public-listing-main">
        <div className="public-listing-container">
          <h1 className="listing-address">{listing.homeCharacteristics.address}</h1>
          <p className="listing-location">
            {listing.homeCharacteristics.city}, {listing.homeCharacteristics.state} {listing.homeCharacteristics.zip}
          </p>
          <div className="listing-details">
            <p><strong>Asking Price</strong>: ${listing.homeCharacteristics.price?.toLocaleString() || '-'}</p>
            <p><strong>Bedrooms</strong>: {listing.homeCharacteristics.beds}</p>
            <p><strong>Bathrooms</strong>: {listing.homeCharacteristics.baths}</p>
            <p><strong>Sq. Ft.</strong>: {listing.homeCharacteristics.squareFootage || '-'}</p>
            <p><strong>Lot Size</strong>: {listing.homeCharacteristics.lotSize || '-'}</p>
            <p><strong>Property Type</strong>: {listing.homeCharacteristics.propertyType}</p>
            <p><strong>Year Built</strong>: {listing.homeCharacteristics.yearBuilt}</p>
          </div>
          {listing.imagesUrls && listing.imagesUrls.length > 0 && (
            <div className="listing-image">
              <img src={listing.imagesUrls[0]} alt="Property" className="property-image" />
            </div>
          )}
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
      </main>
      <Footer />
    </>
  );
};

export default PublicFacingListing;
