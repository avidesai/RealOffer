// Profile.js

import React, { useState } from 'react';
import InputMask from 'react-input-mask';
import useProfileLogic from './ProfileLogic';
import ProfileHeader from './components/ProfileHeader/ProfileHeader';
import Footer from '../../components/Footer/Footer';
import ProfileSpinner from './components/ProfileSpinner/ProfileSpinner';
import EditEmailModal from './components/EditEmailModal/EditEmailModal';
import './Profile.css';

const Profile = () => {
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

  if (loading) return <ProfileSpinner />;

  const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

  return (
    <>
      <ProfileHeader />
      <div className="profile-background">
        <div className="profile-container">
          <h2 className="profile-title">Profile</h2>
          <div className="profile-content">
            <div className="profile-section">
              <h3>Profile Information</h3>
              <div className="profile-form">
                <div className="form-group">
                  <label htmlFor="profilePhotoUrl">Profile Photo</label>
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
                <div className="form-group">
                  <label>Pro Features</label>
                  <div className={`pro-status ${profileData.isPremium ? 'enabled' : 'disabled'}`}>
                    {profileData.isPremium ? 'Pro Features: Enabled' : 'Pro Features: Not Enabled'}
                  </div>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <div className="role-display">
                    {capitalize(profileData.role)}
                  </div>
                </div>
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
                <div className="form-group">
                  <label>Email</label>
                  <div className="email-group">
                    <div className="email-display">{profileData.email}</div>
                    <button className="edit-button" onClick={() => setEmailModalOpen(true)}>Edit</button>
                  </div>
                  {updating.email && <div className="input-spinner"></div>}
                </div>
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
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={noLicense}
                      onChange={handleCheckboxChange}
                    /> 
                    I do not have a real estate license number
                  </label>
                </div>
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
            </div>
            <div className="profile-section">
              <h3>Brokerage Information</h3>
              <div className="profile-form">
                <div className="form-group">
                  <label htmlFor="agencyImage">Agency Photo</label>
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
                <div className="form-group">
                  <label htmlFor="brokerageLicenseNumber">License Number</label>
                  <input
                    type="text"
                    id="brokerageLicenseNumber"
                    value={profileData.brokerageLicenseNumber || ''}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                  {updating.brokerageLicenseNumber && <div class="input-spinner"></div>}
                </div>
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
          </div>
        </div>
      </div>
      <Footer />
      <EditEmailModal isOpen={isEmailModalOpen} onClose={() => setEmailModalOpen(false)} />
    </>
  );
}

export default Profile;
