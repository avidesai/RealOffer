// ForBuyers.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import BuyerPackageFilterSortBar from './components/BuyerPackageFilterSortBar';
import BuyerPackageItem from './components/BuyerPackageItem';
import Pagination from '../MyListings/components/Pagination';
import ShareUrl from '../MyListings/MyListingDashboard/components/ListingOverview/components/ShareUrl/ShareUrl';
import './ForBuyers.css';

const BUYER_PACKAGES_PER_PAGE = 10;

function ForBuyers() {
  const [buyerPackages, setBuyerPackages] = useState([]);
  const [filteredAndSortedPackages, setFilteredAndSortedPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareListingUrl, setShareListingUrl] = useState('');
  const [shareListingId, setShareListingId] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Calculate counts for different statuses
  const activePackagesCount = buyerPackages.filter(pkg => pkg.status === 'active').length;
  const archivedPackagesCount = buyerPackages.filter(pkg => pkg.status === 'archived').length;

  const { user, token, logout } = useAuth();

  // Password setup functions
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordFormData.password) {
      newErrors.password = 'Password is required';
    } else if (passwordFormData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    if (!passwordFormData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (passwordFormData.password !== passwordFormData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    setIsSettingPassword(true);
    setPasswordErrors({});

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/set-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: user.email,
          password: passwordFormData.password
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update user data in localStorage
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const updatedUser = { ...currentUser, isMinimalRegistration: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setPasswordSuccess('Password set successfully!');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordFormData({ password: '', confirmPassword: '' });
          setPasswordSuccess('');
          // Refresh the page to update the user state
          window.location.reload();
        }, 1500);
      } else {
        setPasswordErrors({ general: data.message || 'Failed to set password. Please try again.' });
      }
    } catch (error) {
      console.error('Error setting password:', error);
      setPasswordErrors({ general: 'Failed to set password. Please try again.' });
    } finally {
      setIsSettingPassword(false);
    }
  };

  const fetchBuyerPackages = useCallback(async () => {
    if ((user?._id || user?.id) && token) {
      setLoading(true);
      setError('');
      
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log('Fetched buyer packages:', response.data);
        setBuyerPackages(response.data);
        setError('');
      } catch (error) {
        console.error('Failed to fetch buyer packages:', error);
        
        if (error.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
          await logout();
        } else if (error.response?.status === 403) {
          setError('You do not have permission to access buyer packages.');
        } else if (error.response?.status === 404) {
          setError('Buyer packages service not found.');
        } else if (error.response?.status >= 500) {
          setError('Server error. Please try again later.');
        } else if (error.code === 'NETWORK_ERROR') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Failed to load buyer packages. Please try again.');
        }
        
        // Don't clear existing packages on error, just show the error message
        if (buyerPackages.length === 0) {
          setBuyerPackages([]);
        }
      } finally {
        setLoading(false);
      }
    } else {
      console.error('User ID or token is missing');
      setError('Authentication error. Please log in again.');
      setBuyerPackages([]);
      setLoading(false);
    }
  }, [user, token, logout, buyerPackages.length]);

  useEffect(() => {
    fetchBuyerPackages();
  }, [fetchBuyerPackages]);

  useEffect(() => {
    const filterAndSortPackages = () => {
      let filteredPackages = buyerPackages;
      
      // Apply filter
      if (filter === 'active') {
        filteredPackages = buyerPackages.filter(pkg => pkg.status === 'active');
      } else if (filter === 'archived') {
        filteredPackages = buyerPackages.filter(pkg => pkg.status === 'archived');
      }

      // Apply search
      if (searchQuery.trim()) {
        filteredPackages = filteredPackages.filter(pkg => {
          const searchTerm = searchQuery.toLowerCase().trim();
          
          // Create a comprehensive search string that includes all address components
          const fullAddress = [
            pkg.propertyListing?.homeCharacteristics?.address,
            pkg.propertyListing?.homeCharacteristics?.city,
            pkg.propertyListing?.homeCharacteristics?.state,
            pkg.propertyListing?.homeCharacteristics?.zip,
            pkg.propertyListing?.homeCharacteristics?.county
          ]
            .filter(Boolean) // Remove null/undefined values
            .join(' ')
            .toLowerCase();
          
          // Search through individual fields and combined address
          return (
            pkg.propertyListing?.homeCharacteristics?.address?.toLowerCase().includes(searchTerm) ||
            pkg.propertyListing?.homeCharacteristics?.city?.toLowerCase().includes(searchTerm) ||
            pkg.propertyListing?.homeCharacteristics?.state?.toLowerCase().includes(searchTerm) ||
            pkg.propertyListing?.homeCharacteristics?.zip?.toLowerCase().includes(searchTerm) ||
            pkg.propertyListing?.homeCharacteristics?.county?.toLowerCase().includes(searchTerm) ||
            fullAddress.includes(searchTerm) || // Search the combined address string
            // Handle partial matches for addresses like "117 Panorama" matching "117 Panorama Way"
            searchTerm.split(' ').every(word => fullAddress.includes(word))
          );
        });
      }

      // Sort packages
      if (sort === 'recent') {
        filteredPackages = filteredPackages.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      } else if (sort === 'oldest') {
        filteredPackages = filteredPackages.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      } else if (sort === 'price-high') {
        filteredPackages = filteredPackages.sort((a, b) => 
          (b.propertyListing?.homeCharacteristics?.price || 0) - (a.propertyListing?.homeCharacteristics?.price || 0)
        );
      } else if (sort === 'price-low') {
        filteredPackages = filteredPackages.sort((a, b) => 
          (a.propertyListing?.homeCharacteristics?.price || 0) - (b.propertyListing?.homeCharacteristics?.price || 0)
        );
      }

      setFilteredAndSortedPackages(filteredPackages);
    };

    filterAndSortPackages();
  }, [buyerPackages, filter, sort, searchQuery]);

  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);

  const handleSortChange = useCallback((newSort) => {
    setSort(newSort);
    setCurrentPage(1); // Reset to first page when sort changes
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when search changes
  }, []);

  const handleStatusChange = async (packageId, newStatus) => {
    setError('');
    
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${packageId}/status`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.data) {
        // Update the local state to reflect the change immediately
        setBuyerPackages(prevPackages => 
          prevPackages.map(pkg => 
            pkg._id === packageId 
              ? { ...pkg, status: newStatus }
              : pkg
          )
        );
      }
    } catch (error) {
      console.error('Failed to update buyer package status:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        await logout();
      } else if (error.response?.status === 403) {
        setError('You do not have permission to update this buyer package.');
      } else if (error.response?.status === 404) {
        setError('Buyer package not found. It may have been deleted.');
      } else {
        setError('Failed to update buyer package status. Please try again.');
      }
    }
  };

  const handleShareListing = (buyerPackage) => {
    // Don't attempt to share if the listing has been deleted
    if (!buyerPackage.propertyListing) {
      return;
    }
    setShareListingUrl(buyerPackage.propertyListing.publicUrl);
    setShareListingId(buyerPackage.propertyListing._id);
    setShowShareModal(true);
  };

  const pageCount = Math.ceil(filteredAndSortedPackages.length / BUYER_PACKAGES_PER_PAGE);
  const startIndex = (currentPage - 1) * BUYER_PACKAGES_PER_PAGE;
  const currentPackages = filteredAndSortedPackages.slice(startIndex, startIndex + BUYER_PACKAGES_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  if (loading) {
    return (
      <div className="for-buyers">
        <div className="for-buyers-loading">
          <div className="spinner"></div>
          <p>Loading your buyer packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="for-buyers">
      {error && (
        <div className="for-buyers-error">
          <p>{error}</p>
        </div>
      )}
      
      {/* Minimal User Banner */}
      {user?.isMinimalRegistration && (
        <div className="fb-minimal-user-banner">
          <div className="fb-banner-content">
            <div className="fb-banner-icon">🔒</div>
            <div className="fb-banner-text">
              <h4>Complete Your Account</h4>
              <p>Your account was created with minimal registration. Set a password to secure your account and enable normal login.</p>
            </div>
            <button 
              className="fb-banner-action-btn" 
              onClick={() => setShowPasswordModal(true)}
            >
              Set Password
            </button>
          </div>
        </div>
      )}
      
      <BuyerPackageFilterSortBar
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onSearch={handleSearch}
        totalPackages={buyerPackages.length}
        activePackagesCount={activePackagesCount}
        archivedPackagesCount={archivedPackagesCount}
        filteredCount={filteredAndSortedPackages.length}
        searchQuery={searchQuery}
      />
      
      {currentPackages.length > 0 ? (
        <>
          {currentPackages.map(buyerPackage => (
            <BuyerPackageItem 
              key={buyerPackage._id} 
              buyerPackage={buyerPackage} 
              onStatusChange={handleStatusChange}
              onShareListing={handleShareListing}
            />
          ))}
          
          {pageCount > 1 && (
            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <div className="for-buyers-empty">
          {buyerPackages.length === 0 ? (
            <>
              <p>You don't have any buyer packages yet.</p>
              <p>Browse public listings to join a buyer package.</p>
            </>
          ) : (searchQuery || filter !== 'all') ? (
            <>
              <p>No buyer packages match your current filters.</p>
              <button onClick={() => {
                setSearchQuery('');
                setFilter('all');
                setCurrentPage(1);
              }}>
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <p>You don't have any buyer packages yet.</p>
              <p>Browse public listings to join a buyer package.</p>
            </>
          )}
        </div>
      )}
      
      {showShareModal && (
        <ShareUrl
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareListingId('');
            setShareListingUrl('');
          }}
          url={shareListingUrl}
          listingId={shareListingId}
        />
      )}
      
      {/* Password Setup Modal */}
      {showPasswordModal && (
        <div className="fb-modal-overlay">
          <div className="fb-modal-content">
            <div className="fb-modal-header">
              <h3>Set Your Password</h3>
              <button className="fb-modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            
            {passwordSuccess ? (
              <div className="fb-modal-body">
                <div className="fb-success-message">
                  <p>{passwordSuccess}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="fb-modal-body">
                <p className="fb-modal-description">
                  Please set a password to secure your account. You'll be able to log in normally after setting your password.
                </p>
                
                {passwordErrors.general && (
                  <div className="fb-error-message">
                    {passwordErrors.general}
                  </div>
                )}
                
                <div className="fb-form-group">
                  <label htmlFor="password">New Password</label>
                  <div className="fb-password-input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={passwordFormData.password}
                      onChange={handlePasswordInputChange}
                      className={`fb-form-control ${passwordErrors.password ? 'fb-input-error' : ''}`}
                      placeholder="Create a password (min 6 characters)"
                      minLength="6"
                    />
                    <button
                      type="button"
                      className="fb-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {passwordErrors.password && <div className="fb-error-text">{passwordErrors.password}</div>}
                </div>
                
                <div className="fb-form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="fb-password-input-group">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordFormData.confirmPassword}
                      onChange={handlePasswordInputChange}
                      className={`fb-form-control ${passwordErrors.confirmPassword ? 'fb-input-error' : ''}`}
                      placeholder="Confirm your password"
                      minLength="6"
                    />
                    <button
                      type="button"
                      className="fb-password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && <div className="fb-error-text">{passwordErrors.confirmPassword}</div>}
                </div>
                
                <div className="fb-modal-actions">
                  <button type="button" className="fb-btn-secondary" onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="fb-btn-primary" disabled={isSettingPassword}>
                    {isSettingPassword ? 'Setting Password...' : 'Set Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ForBuyers; 