// Profile.js

import React, { useState } from 'react';
import InputMask from 'react-input-mask';
import { useNavigate } from 'react-router-dom';
import useProfileLogic from './ProfileLogic';
import ProfileHeader from './components/ProfileHeader/ProfileHeader';
import Footer from '../../components/Footer/Footer';
import ProfileSpinner from './components/ProfileSpinner/ProfileSpinner';
import EditEmailModal from './components/EditEmailModal/EditEmailModal';
import Avatar from '../../../../components/Avatar/Avatar';
import { hasPremiumAccess, getTrialStatus, formatTrialEndDate } from '../../../../utils/trialUtils';
import './Profile.css';
import '../../components/ForBuyers/ForBuyers.css'; // Import for consistent styling

const Profile = () => {
  const navigate = useNavigate();
  const {
    profileData,
    loading,
    updating,
    isUploading,
    noLicense,
    handleInputChange,
    handlePhotoUpload,
    handleCheckboxChange,
    handleLogoFitChange
  } = useProfileLogic();

  const [isEmailModalOpen, setEmailModalOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleUpgradeClick = () => {
    navigate('/upgrade');
  };

  const handleManageSubscription = () => {
    navigate('/dashboard/manage-subscription');
  };

  if (loading) return <ProfileSpinner />;

  const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

  return (
    <>
      <ProfileHeader backDestination="/dashboard" />
      <div className="pp-profile-background">
        <div className="pp-profile-container">
          <h2 className="pp-profile-title">Profile</h2>
          
          {/* Minimal User Notice */}
          {profileData.isMinimalRegistration && (
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
          
          {profileData.role !== 'buyer' && (
            <p className="pp-profile-autosave-notice">
              Changes are saved automatically.
            </p>
          )}
          <div className={`pp-profile-content ${profileData.role === 'buyer' ? 'pp-buyer-only' : ''}`}>
            {/* Agent Information Column */}
            <div className="pp-profile-column pp-agent-info">
              <h3 className='pp-profile-section-title'>{profileData.role === 'buyer' ? 'Buyer Information' : 'Agent Information'}</h3>
              {/* Profile Photo */}
              <div className="pp-form-group">
                <label htmlFor="profilePhotoUrl" className='pp-photo-text'>Profile Photo</label>
                <div className="pp-upload-area-profile">
                  <Avatar 
                    src={profileData.profilePhotoUrl}
                    firstName={profileData.firstName}
                    lastName={profileData.lastName}
                    size="upload"
                    className="pp-profile-photo"
                    alt={`${profileData.firstName} ${profileData.lastName}`}
                  />
                  <label className="pp-upload-label-profile" htmlFor="profilePhotoUrl">
                    Upload Photo
                    <input
                      type="file"
                      id="profilePhotoUrl"
                      className="pp-upload-input"
                      onChange={(e) => handlePhotoUpload(e, 'profilePhotoUrl')}
                    />
                  </label>
                </div>
                {isUploading.profilePhotoUrl && <div className="pp-input-spinner"></div>}
              </div>
              {/* Account Status */}
              <div className="pp-account-status-section">
                <div className="pp-account-status-row">
                  {hasPremiumAccess(profileData) ? (
                    profileData.isOnTrial ? (
                      <span className="pp-pro-status">
                        Pro Trial
                      </span>
                    ) : (
                      <span className="pp-pro-status">
                        Pro Account
                      </span>
                    )
                  ) : (
                    <span className="pp-pro-status pp-disabled">
                      Free Account
                    </span>
                  )}
                </div>
                {/* Show trial end date if user is on trial */}
                {getTrialStatus(profileData) === 'active' && profileData.trialEndDate && (
                  <div className="pp-trial-end-date">
                    Trial ends: {formatTrialEndDate(profileData.trialEndDate)}
                  </div>
                )}
                {/* Show manage subscription button only for paid premium users */}
                {profileData.isPremium && !profileData.isOnTrial ? (
                  <button className="pp-profile-manage-subscription-btn" onClick={handleManageSubscription}>
                    Manage Subscription
                  </button>
                ) : (
                  <button className="pp-profile-upgrade-btn" onClick={handleUpgradeClick}>
                    {getTrialStatus(profileData) === 'active' ? 'Upgrade to Pro' : 'Upgrade to Pro'}
                  </button>
                )}
              </div>
              {/* Role */}
              <div className="pp-form-group">
                <label>Role</label>
                <div className="pp-role-display">
                  {capitalize(profileData.role)}
                </div>
              </div>
              {/* Agent Status for Buyers */}
              {profileData.role === 'buyer' && profileData.hasAgent !== null && (
                <div className="pp-form-group">
                  <label>Agent Status</label>
                  <div className="pp-role-display">
                    {profileData.hasAgent ? 'I have an agent' : 'I don\'t have an agent'}
                  </div>
                </div>
              )}
              {/* First Name */}
              <div className="pp-form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  value={profileData.firstName || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.firstName && <div className="pp-input-spinner"></div>}
              </div>
              {/* Last Name */}
              <div className="pp-form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  value={profileData.lastName || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.lastName && <div className="pp-input-spinner"></div>}
              </div>
              {/* Email */}
              <div className="pp-form-group">
                <label>Email</label>
                <div className="pp-email-group">
                  <div className="pp-email-display">{profileData.email}</div>
                  <button className="pp-edit-button" onClick={() => setEmailModalOpen(true)}>Edit</button>
                </div>
                {updating.email && <div className="pp-input-spinner"></div>}
              </div>
              {/* Agent License Number - Hidden for buyers */}
              {profileData.role !== 'buyer' && (
                <div className="pp-form-group">
                  <label htmlFor="agentLicenseNumber">License Number</label>
                  <input
                    type="text"
                    id="agentLicenseNumber"
                    value={profileData.agentLicenseNumber || ''}
                    onChange={handleInputChange}
                    disabled={noLicense}
                    className="pp-form-control"
                  />
                  {updating.agentLicenseNumber && <div className="pp-input-spinner"></div>}
                  <label className="pp-profile-checkbox-label">
                    <input
                      type="checkbox"
                      checked={noLicense}
                      onChange={handleCheckboxChange}
                    />
                    I do not have a real estate license number
                  </label>
                </div>
              )}
              {/* Phone Number */}
              <div className="pp-form-group">
                <label htmlFor="phone">Phone Number</label>
                <InputMask
                  mask="(999) 999-9999"
                  value={profileData.phone || ''}
                  onChange={handleInputChange}
                >
                  {(inputProps) => (
                    <input
                      {...inputProps}
                      type="text"
                      id="phone"
                      className="pp-form-control"
                    />
                  )}
                </InputMask>
                {updating.phone && <div className="pp-input-spinner"></div>}
              </div>
              
              {/* Password Setup for Minimal Users */}
              {profileData.isMinimalRegistration && (
                <div className="pp-form-group">
                  <label>Account Security</label>
                  <div className="pp-password-setup-section">
                    <div className="pp-password-setup-notice">
                      <p>Your account was created with minimal registration. Set a password to secure your account.</p>
                    </div>
                    <button 
                      className="pp-set-password-btn" 
                      onClick={() => setShowPasswordModal(true)}
                    >
                      Set Password
                    </button>
                  </div>
                </div>
              )}
              {/* Address Line 1 */}
              <div className="pp-form-group">
                <label htmlFor="addressLine1">Address Line 1</label>
                <input
                  type="text"
                  id="addressLine1"
                  value={profileData.addressLine1 || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.addressLine1 && <div className="pp-input-spinner"></div>}
              </div>
              {/* Address Line 2 */}
              <div className="pp-form-group">
                <label htmlFor="addressLine2">Address Line 2</label>
                <input
                  type="text"
                  id="addressLine2"
                  value={profileData.addressLine2 || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.addressLine2 && <div className="pp-input-spinner"></div>}
              </div>
              {/* Website */}
              <div className="pp-form-group">
                <label htmlFor="homepage">Website</label>
                <input
                  type="text"
                  id="homepage"
                  value={profileData.homepage || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.homepage && <div className="pp-input-spinner"></div>}
              </div>
            </div>
            {/* Brokerage Information Column - Hidden for buyers */}
            {profileData.role !== 'buyer' && (
              <div className="pp-profile-column pp-brokerage-info">
                <h3 className='pp-profile-section-title'>Brokerage Information</h3>
              {/* Agency Photo */}
              <div className="pp-form-group">
                <label htmlFor="agencyImage" className='pp-photo-text'>Agency Logo</label>
                <div className="pp-upload-area-profile pp-logo-upload-area">
                  <div className="pp-logo-preview-container">
                    <img 
                      src={profileData.agencyImage || '/src/assets/images/default-logo.png'}
                      alt={profileData.agencyName || "Agency Logo"}
                      className="pp-agency-logo-preview"
                      data-fit={profileData.logoFit || 'contain'}
                    />
                  </div>
                  <div className="pp-logo-upload-controls">
                    <label className="pp-upload-label-profile" htmlFor="agencyImage">
                      Upload Logo
                      <input
                        type="file"
                        id="agencyImage"
                        className="pp-upload-input"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'agencyImage')}
                      />
                    </label>
                    {profileData.agencyImage && (
                      <div className="pp-logo-fit-options">
                        <label className="pp-fit-option-label">Logo Fit:</label>
                        <select 
                          className="pp-fit-option-select"
                          value={profileData.logoFit || 'contain'}
                          onChange={(e) => handleLogoFitChange(e.target.value)}
                        >
                          <option value="contain">Fit Entire Logo</option>
                          <option value="cover">Fill Space</option>
                          <option value="stretch">Stretch to Fit</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                {isUploading.agencyImage && <div className="pp-input-spinner"></div>}
              </div>
              {/* Agency Name */}
              <div className="pp-form-group">
                <label htmlFor="agencyName">Brokerage Name</label>
                <input
                  type="text"
                  id="agencyName"
                  value={profileData.agencyName || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.agencyName && <div className="pp-input-spinner"></div>}
              </div>
              {/* Brokerage License Number */}
              <div className="pp-form-group">
                <label htmlFor="brokerageLicenseNumber">Brokerage License Number</label>
                <input
                  type="text"
                  id="brokerageLicenseNumber"
                  value={profileData.brokerageLicenseNumber || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.brokerageLicenseNumber && <div className="pp-input-spinner"></div>}
              </div>
              {/* Brokerage Phone Number */}
              <div className="pp-form-group">
                <label htmlFor="brokeragePhoneNumber">Phone Number</label>
                <InputMask
                  mask="(999) 999-9999"
                  value={profileData.brokeragePhoneNumber || ''}
                  onChange={handleInputChange}
                >
                  {(inputProps) => (
                    <input
                      {...inputProps}
                      type="text"
                      id="brokeragePhoneNumber"
                      className="pp-form-control"
                    />
                  )}
                </InputMask>
                {updating.brokeragePhoneNumber && <div className="pp-input-spinner"></div>}
              </div>
              {/* Agency Address Line 1 */}
              <div className="pp-form-group">
                <label htmlFor="agencyAddressLine1">Address Line 1</label>
                <input
                  type="text"
                  id="agencyAddressLine1"
                  value={profileData.agencyAddressLine1 || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.agencyAddressLine1 && <div className="pp-input-spinner"></div>}
              </div>
              {/* Agency Address Line 2 */}
              <div className="pp-form-group">
                <label htmlFor="agencyAddressLine2">Address Line 2</label>
                <input
                  type="text"
                  id="agencyAddressLine2"
                  value={profileData.agencyAddressLine2 || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.agencyAddressLine2 && <div className="pp-input-spinner"></div>}
              </div>
              {/* Brokerage Website */}
              <div className="pp-form-group">
                <label htmlFor="agencyWebsite">Brokerage Website</label>
                <input
                  type="text"
                  id="agencyWebsite"
                  value={profileData.agencyWebsite || ''}
                  onChange={handleInputChange}
                  className="pp-form-control"
                />
                {updating.agencyWebsite && <div className="pp-input-spinner"></div>}
              </div>
            </div>
            )}
          </div>
          <EditEmailModal isOpen={isEmailModalOpen} onClose={() => setEmailModalOpen(false)} />
          
          {/* Password Setup Modal */}
          {showPasswordModal && (
            <PasswordSetupModal 
              isOpen={showPasswordModal} 
              onClose={() => setShowPasswordModal(false)}
              onSuccess={() => {
                setShowPasswordModal(false);
                // Refresh profile data to update isMinimalRegistration status
                window.location.reload();
              }}
            />
          )}
        </div>
        <Footer />
      </div>
    </>
  );
}

// Password Setup Modal Component
const PasswordSetupModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/set-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          email: JSON.parse(localStorage.getItem('user')).email,
          password: formData.password
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update user data in localStorage
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const updatedUser = { ...currentUser, isMinimalRegistration: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setSuccessMessage('Password set successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setErrors({ general: data.message || 'Failed to set password. Please try again.' });
      }
    } catch (error) {
      console.error('Error setting password:', error);
      setErrors({ general: 'Failed to set password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fb-modal-overlay">
      <div className="fb-modal-content">
        <div className="fb-modal-header">
          <h3>Set Your Password</h3>
          <button className="fb-modal-close" onClick={onClose}>×</button>
        </div>
        
        {successMessage ? (
          <div className="fb-modal-body">
            <div className="fb-success-message">
              <p>{successMessage}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="fb-modal-body">
            <p className="fb-modal-description">
              Please set a password to secure your account. You'll be able to log in normally after setting your password.
            </p>
            
            {errors.general && (
              <div className="fb-error-message">
                {errors.general}
              </div>
            )}
            
            <div className="fb-form-group">
              <label htmlFor="password">New Password</label>
              <div className="fb-password-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`fb-form-control ${errors.password ? 'fb-input-error' : ''}`}
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
              {errors.password && <div className="fb-error-text">{errors.password}</div>}
            </div>
            
            <div className="fb-form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="fb-password-input-group">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`fb-form-control ${errors.confirmPassword ? 'fb-input-error' : ''}`}
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
              {errors.confirmPassword && <div className="fb-error-text">{errors.confirmPassword}</div>}
            </div>
            
            <div className="fb-modal-actions">
              <button type="button" className="fb-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="fb-btn-primary" disabled={isLoading}>
                {isLoading ? 'Setting Password...' : 'Set Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
