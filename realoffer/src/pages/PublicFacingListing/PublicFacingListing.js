// PublicFacingListing.js

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
  
  // Form state management
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'agent', // Default to agent as requested
    password: '',
    confirmPassword: '',
  });
  
  // UI state
  const [formStep, setFormStep] = useState('initial'); // 'initial', 'login', 'signup', 'success'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

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
    // Clear error when user starts typing
    if (error) setError('');
  };

  const checkUserExists = async (email) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userCheck = await checkUserExists(formData.email);
      
      if (userCheck.exists) {
        // User exists - show login form
        setFormStep('login');
      } else {
        // User doesn't exist - show signup form
        setFormStep('signup');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await createBuyerPackage(data.user._id, data.token);
      } else {
        setError(data.message || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create user account
      const signupResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });
      
      const signupData = await signupResponse.json();
      
      if (signupResponse.ok) {
        // Auto-login after signup
        const loginResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            password: formData.password 
          }),
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
          await createBuyerPackage(loginData.user._id, loginData.token);
        } else {
          setError('Account created but login failed. Please try logging in.');
        }
      } else {
        setError(signupData.message || 'Signup failed. Please try again.');
      }
    } catch (error) {
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createBuyerPackage = async (userId, token) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          propertyListingId: listing._id,
          publicUrl: window.location.href,
          userRole: formData.role,
          userInfo: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            role: formData.role
          }
        }),
      });
      
      if (response.ok) {
        const buyerPackage = await response.json();
        
        // Show success state
        setFormStep('success');
        setSuccessMessage({
          title: "Welcome to RealOffer!",
          message: "Your buyer package has been created successfully.",
          nextSteps: [
            "View property documents and disclosures",
            "Access AI-powered market analysis", 
            "Make offers when ready"
          ]
        });
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          window.location.href = `/buyerpackage/${buyerPackage._id}`;
        }, 3000);
      } else {
        setError('Failed to create buyer package. Please try again.');
      }
    } catch (error) {
      console.error('Error creating buyer package:', error);
      setError('Failed to create buyer package. Please try again.');
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
    if (formStep === 'success') {
      return (
        <div className="pfl-form-container">
          <div className="pfl-success-state">
            <div className="pfl-success-icon">✓</div>
            <h2>{successMessage.title}</h2>
            <p>{successMessage.message}</p>
            <div className="pfl-next-steps">
              <h4>What you can do now:</h4>
              <ul>
                {successMessage.nextSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
            <p className="pfl-redirect-message">
              Redirecting you to your buyer dashboard...
            </p>
          </div>
        </div>
      );
    }

    if (formStep === 'login') {
      return (
        <div className="pfl-form-container">
          <h2>Welcome back!</h2>
          <p>Please enter your password to access this listing.</p>
          {error && <p className="pfl-error">{error}</p>}
          <form className="pfl-inquiry-form" onSubmit={handleLogin}>
            <div className="pfl-form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit" className="pfl-request-button" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login & View Listing'}
            </button>
          </form>
        </div>
      );
    }

    if (formStep === 'signup') {
      return (
        <div className="pfl-form-container">
          <h2>Create your account</h2>
          <p>Complete your registration to access this listing.</p>
          {error && <p className="pfl-error">{error}</p>}
          <form className="pfl-inquiry-form" onSubmit={handleSignup}>
            <div className="pfl-form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Create a password (min 6 characters)"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="pfl-form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>
            <button type="submit" className="pfl-request-button" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign Up & View Listing'}
            </button>
          </form>
        </div>
      );
    }

    // Initial form
    return (
      <div className="pfl-form-container">
        <h2>View Listing Information</h2>
        <p>Get access to disclosures, make offers, and more.</p>
        
        <div className="pfl-benefits-section">
          <h4>What you'll get access to:</h4>
          <ul className="pfl-benefits-list">
            <li>✓ Property disclosures & documents</li>
            <li>✓ AI-powered market analysis</li>
            <li>✓ Make offers directly</li>
            <li>✓ Track property updates</li>
          </ul>
        </div>

        {error && <p className="pfl-error">{error}</p>}
        
        <form className="pfl-inquiry-form" onSubmit={handleInitialSubmit}>
          <div className="pfl-form-row">
            <div className="pfl-form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="pfl-form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="pfl-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="pfl-form-group">
            <label htmlFor="role">I am a...</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              <option value="agent">Agent</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>
          <button type="submit" className="pfl-request-button" disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
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