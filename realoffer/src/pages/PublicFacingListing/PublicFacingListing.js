// PublicFacingListing.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import PFLoginForm from './PFLoginForm/PFLoginForm';
import PFSignupForm from './PFSignupForm/PFSignupForm';
import './PublicFacingListing.css';

const getPropertyTypeText = (value) => {
  const propertyTypes = {
    singleFamily: 'Single Family',
    condo: 'Condominium',
    townhouse: 'Townhouse',
    multiFamily: 'Multi Family',
    land: 'Land',
    commercial: 'Commercial',
  };
  return propertyTypes[value] || 'Unknown Property Type';
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
};

const formatNumber = (num) => {
  return num?.toLocaleString() || '-';
};

const PublicFacingListing = () => {
  const { token } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [formState, setFormState] = useState('contact'); // 'contact', 'login', 'signup'
  const [formData, setFormData] = useState({
    role: '',
    name: '',
    email: '',
  });

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/public/${token}`);
        const data = await response.json();
        setListing(data);
      } catch (error) {
        console.error('Error fetching listing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const { exists } = await response.json();
      setFormState(exists ? 'login' : 'signup');
    } catch (error) {
      console.error('Error checking email:', error);
    }
  };

  const nextImage = () => {
    if (listing.imagesUrls && listing.imagesUrls.length > 1) {
      setIsImageLoading(true);
      setCurrentImageIndex((prev) => (prev + 1) % listing.imagesUrls.length);
    }
  };

  const previousImage = () => {
    if (listing.imagesUrls && listing.imagesUrls.length > 1) {
      setIsImageLoading(true);
      setCurrentImageIndex((prev) => (prev === 0 ? listing.imagesUrls.length - 1 : prev - 1));
    }
  };

  const renderForm = () => {
    if (formState === 'login') {
      return <PFLoginForm email={formData.email} onLoginSuccess={() => setFormState('success')} />;
    }
    if (formState === 'signup') {
      return (
        <PFSignupForm
          email={formData.email}
          role={formData.role}
          onSignupSuccess={() => setFormState('success')}
        />
      );
    }
    return (
      <form className="pfl-inquiry-form" onSubmit={handleFormSubmit}>
        <div className="pfl-form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            required
          >
            <option value="">I am a...</option>
            <option value="buyer">Buyer</option>
            <option value="agent">Agent</option>
          </select>
        </div>
        <div className="pfl-form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="pfl-form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>
        <button type="submit" className="pfl-request-button">
          Request Information
        </button>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="pfl-loading-container">
        <div className="pfl-loading-spinner"></div>
        <p>Loading property details...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="pfl-error-container">
        <div className="pfl-error-message">
          <h2>Property Not Found</h2>
          <p>This listing is no longer available or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-listing-container">
      <Header />
      <main className="pfl-content">
        <div className="pfl-property-header">
          <h1 className="pfl-property-title">
            {listing.homeCharacteristics.address}
            <span className="pfl-property-location">
              {listing.homeCharacteristics.city}, {listing.homeCharacteristics.state}{' '}
              {listing.homeCharacteristics.zip}
            </span>
          </h1>
        </div>
        <div className="pfl-content-grid">
          <div className="pfl-main-content">
            <div className="pfl-property-details">
              <div className="pfl-details-grid">
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Bedrooms</span>
                  <span className="pfl-detail-value">{listing.homeCharacteristics.beds}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Bathrooms</span>
                  <span className="pfl-detail-value">{listing.homeCharacteristics.baths}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Square Feet</span>
                  <span className="pfl-detail-value">{formatNumber(listing.homeCharacteristics.squareFootage)}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Lot Size</span>
                  <span className="pfl-detail-value">{formatNumber(listing.homeCharacteristics.lotSize)}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Year Built</span>
                  <span className="pfl-detail-value">{listing.homeCharacteristics.yearBuilt || '-'}</span>
                </div>
                <div className="pfl-detail-item">
                  <span className="pfl-detail-label">Type</span>
                  <span className="pfl-detail-value">{getPropertyTypeText(listing.homeCharacteristics.propertyType)}</span>
                </div>
              </div>
            </div>
            <div className="pfl-gallery-section">
              <div className="pfl-gallery-container">
                {listing.imagesUrls && listing.imagesUrls.length > 0 && (
                  <>
                    <img
                      src={listing.imagesUrls[currentImageIndex]}
                      alt="Property"
                      className={`pfl-main-image ${isImageLoading ? 'loading' : ''}`}
                      onLoad={() => setIsImageLoading(false)}
                    />
                    <div className="pfl-image-count">
                      {currentImageIndex + 1} / {listing.imagesUrls.length}
                    </div>
                    <div className="pfl-price-overlay">
                      <span className="pfl-price-amount">{formatPrice(listing.homeCharacteristics.price)}</span>
                    </div>
                    {listing.imagesUrls.length > 1 && (
                      <div className="pfl-gallery-controls">
                        <button
                          onClick={previousImage}
                          className="pfl-gallery-button prev"
                          aria-label="Previous image"
                        >
                          ←
                        </button>
                        <button
                          onClick={nextImage}
                          className="pfl-gallery-button next"
                          aria-label="Next image"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="pfl-contact-form">{renderForm()}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicFacingListing;
