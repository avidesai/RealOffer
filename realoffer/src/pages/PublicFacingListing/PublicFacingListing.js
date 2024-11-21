import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import './PublicFacingListing.css';

const getPropertyTypeText = (value) => {
  const propertyTypes = {
    singleFamily: 'Single Family',
    condo: 'Condominium',
    townhouse: 'Townhouse',
    multiFamily: 'Multi-Family',
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
  const [formData, setFormData] = useState({
    role: '',
    name: '',
    email: ''
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Add form submission logic here
    console.log('Form submitted:', formData);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading property details...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Property Not Found</h2>
          <p>This listing is no longer available or has expired.</p>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    if (listing.imagesUrls && listing.imagesUrls.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.imagesUrls.length);
    }
  };

  const previousImage = () => {
    if (listing.imagesUrls && listing.imagesUrls.length > 1) {
      setCurrentImageIndex((prev) => (prev === 0 ? listing.imagesUrls.length - 1 : prev - 1));
    }
  };

  return (
    <div className="public-listing-container">
      <Header />
      <main className="public-listing-content">
        <div className="property-header">
          <h1 className="property-title">
            {listing.homeCharacteristics.address}
            <span className="property-location">
              {listing.homeCharacteristics.city}, {listing.homeCharacteristics.state} {listing.homeCharacteristics.zip}
            </span>
          </h1>
        </div>

        <div className="content-grid">
          <div className="main-content">
            <div className="property-details">
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Bedrooms</span>
                  <span className="detail-value">{listing.homeCharacteristics.beds}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Bathrooms</span>
                  <span className="detail-value">{listing.homeCharacteristics.baths}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Square Feet</span>
                  <span className="detail-value">{formatNumber(listing.homeCharacteristics.squareFootage)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Lot Size</span>
                  <span className="detail-value">{formatNumber(listing.homeCharacteristics.lotSize)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Year Built</span>
                  <span className="detail-value">{listing.homeCharacteristics.yearBuilt || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Property Type</span>
                  <span className="detail-value">{getPropertyTypeText(listing.homeCharacteristics.propertyType)}</span>
                </div>
              </div>
            </div>

            <div className="gallery-section">
              <div className="gallery-container">
                {listing.imagesUrls && listing.imagesUrls.length > 0 && (
                  <>
                    <img 
                      src={listing.imagesUrls[currentImageIndex]} 
                      alt="Property" 
                      className="main-image" 
                    />
                    <div className="image-count">
                      {currentImageIndex + 1} / {listing.imagesUrls.length}
                    </div>
                    <div className="price-overlay">
                      <span className="price-amount">{formatPrice(listing.homeCharacteristics.price)}</span>
                    </div>
                    {listing.imagesUrls.length > 1 && (
                      <div className="gallery-controls">
                        <button 
                          onClick={previousImage} 
                          className="gallery-button prev"
                          aria-label="Previous image"
                        >
                          ←
                        </button>
                        <button 
                          onClick={nextImage} 
                          className="gallery-button next"
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

          <div className="contact-form">
            <div className="form-container">
              <h2>Request Property Information</h2>
              <p>Get access to disclosures, make offers, and more.</p>
              
              <form className="inquiry-form" onSubmit={handleSubmit}>
                <div className="form-group">
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

                <div className="form-group">
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

                <div className="form-group">
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

                <button type="submit" className="request-button">
                  Request Information
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicFacingListing;