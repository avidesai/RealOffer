// Profile.js

import React, { useState } from 'react';
import InputMask from 'react-input-mask';
import { useNavigate } from 'react-router-dom';
import useProfileLogic from './ProfileLogic';
import ProfileHeader from './components/ProfileHeader/ProfileHeader';
import Footer from '../../components/Footer/Footer';
import ProfileSpinner from './components/ProfileSpinner/ProfileSpinner';
import EditEmailModal from './components/EditEmailModal/EditEmailModal';
import './Profile.css';

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
    handleCheckboxChange
  } = useProfileLogic();

  const [isEmailModalOpen, setEmailModalOpen] = useState(false);

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
      <div className="profile-background">
        <div className="profile-container">
          <h2 className="profile-title">Profile</h2>
          <div className="profile-content">
            {/* Row 1: Profile Info Section Title / Brokerage Info Section Title */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell"><h3>Agent Information</h3></div>
              <div className="profile-grid-cell"><h3>Brokerage Information</h3></div>
            </div>
            {/* Row 2: Profile Photo / Agency Photo */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="profilePhotoUrl" className='photo-text'>Profile Photo</label>
                  <div className="upload-container">
                    <img src={profileData.profilePhotoUrl} alt={`${profileData.firstName} ${profileData.lastName}`} className="profile-photo" />
                    <input
                      type="file"
                      id="profilePhotoUrl"
                      className="upload-input"
                      onChange={(e) => handlePhotoUpload(e, 'profilePhotoUrl')}
                    />
                  </div>
                  {isUploading.profilePhotoUrl && <div className="input-spinner"></div>}
                </div>
              </div>
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="agencyImage" className='photo-text'>Agency Photo</label>
                  <div className="upload-container">
                    <img src={profileData.agencyImage} alt="" className="agency-photo" />
                    <input
                      type="file"
                      id="agencyImage"
                      className="upload-input"
                      onChange={(e) => handlePhotoUpload(e, 'agencyImage')}
                    />
                  </div>
                  {isUploading.agencyImage && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
            {/* Row 3: Account Status (with button) / empty */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="account-status-section">
                  <div className="account-status-row">
                    {profileData.isPremium ? (
                      <span className="pro-status">
                        <span className="pro-icon" role="img" aria-label="Pro">⭐</span>
                        Pro Account
                      </span>
                    ) : (
                      <span className="pro-status disabled">
                        Free Account
                      </span>
                    )}
                  </div>
                  {profileData.isPremium ? (
                    <button className="profile-manage-subscription-btn" onClick={handleManageSubscription}>
                      Manage Subscription
                    </button>
                  ) : (
                    <button className="profile-upgrade-btn" onClick={handleUpgradeClick}>
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
              <div className="profile-grid-cell"></div>
            </div>
            {/* Row 4: Role / Agency Name */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label>Role</label>
                  <div className="role-display">
                    {capitalize(profileData.role)}
                  </div>
                </div>
              </div>
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="agencyName">Name</label>
                  <input
                    type="text"
                    id="agencyName"
                    value={profileData.agencyName || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.agencyName && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
            {/* Row 5: First Name / License Number */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    value={profileData.firstName || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.firstName && <div className="input-spinner"></div>}
                </div>
              </div>
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="brokerageLicenseNumber">License Number</label>
                  <input
                    type="text"
                    id="brokerageLicenseNumber"
                    value={profileData.brokerageLicenseNumber || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.brokerageLicenseNumber && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
            {/* Row 6: Last Name / Phone Number */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    value={profileData.lastName || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.lastName && <div className="input-spinner"></div>}
                </div>
              </div>
              <div className="profile-grid-cell">
                <div className="form-group">
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
                        className="form-control"
                      />
                    )}
                  </InputMask>
                  {updating.brokeragePhoneNumber && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
            {/* Row 7: Email / Agency Address Line 1 */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label>Email</label>
                  <div className="email-group">
                    <div className="email-display">{profileData.email}</div>
                    <button className="edit-button" onClick={() => setEmailModalOpen(true)}>Edit</button>
                  </div>
                  {updating.email && <div className="input-spinner"></div>}
                </div>
              </div>
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="agencyAddressLine1">Address Line 1</label>
                  <input
                    type="text"
                    id="agencyAddressLine1"
                    value={profileData.agencyAddressLine1 || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.agencyAddressLine1 && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
            {/* Row 8: License Number / Agency Address Line 2 */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="agentLicenseNumber">License Number</label>
                  <input
                    type="text"
                    id="agentLicenseNumber"
                    value={profileData.agentLicenseNumber || ''}
                    onChange={handleInputChange}
                    disabled={noLicense}
                    className="form-control"
                  />
                  {updating.agentLicenseNumber && <div className="input-spinner"></div>}
                  <label className="profile-checkbox-label">
                    <input
                      type="checkbox"
                      checked={noLicense}
                      onChange={handleCheckboxChange}
                    /> 
                    I do not have a real estate license number
                  </label>
                </div>
              </div>
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="agencyAddressLine2">Address Line 2</label>
                  <input
                    type="text"
                    id="agencyAddressLine2"
                    value={profileData.agencyAddressLine2 || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.agencyAddressLine2 && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
            {/* Row 9: Phone / Agency Website */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
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
                        className="form-control"
                      />
                    )}
                  </InputMask>
                  {updating.phone && <div className="input-spinner"></div>}
                </div>
              </div>
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="agencyWebsite">Brokerage Website</label>
                  <input
                    type="text"
                    id="agencyWebsite"
                    value={profileData.agencyWebsite || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.agencyWebsite && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
            {/* Row 10: Address Line 1 / empty */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="addressLine1">Address Line 1</label>
                  <input
                    type="text"
                    id="addressLine1"
                    value={profileData.addressLine1 || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.addressLine1 && <div className="input-spinner"></div>}
                </div>
              </div>
              <div className="profile-grid-cell"></div>
            </div>
            {/* Row 11: Address Line 2 / empty */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="addressLine2">Address Line 2</label>
                  <input
                    type="text"
                    id="addressLine2"
                    value={profileData.addressLine2 || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.addressLine2 && <div className="input-spinner"></div>}
                </div>
              </div>
              <div className="profile-grid-cell"></div>
            </div>
            {/* Row 12: Website / empty */}
            <div className="profile-grid-row">
              <div className="profile-grid-cell">
                <div className="form-group">
                  <label htmlFor="homepage">Website</label>
                  <input
                    type="text"
                    id="homepage"
                    value={profileData.homepage || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.homepage && <div className="input-spinner"></div>}
                </div>
              </div>
              <div className="profile-grid-cell"></div>
            </div>
          </div>
          <EditEmailModal isOpen={isEmailModalOpen} onClose={() => setEmailModalOpen(false)} />
        </div>
        <Footer />
      </div>
    </>
  );
}

export default Profile;
