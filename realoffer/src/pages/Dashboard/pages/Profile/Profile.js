import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import ProfileHeader from './components/ProfileHeader';
import Footer from '../../components/Footer/Footer';
import ProfileSpinner from './components/ProfileSpinner';
import './Profile.css';
import axios from 'axios';

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [isUploading, setIsUploading] = useState({});
  const [noLicense, setNoLicense] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const debounceTimer = useRef({});

  useEffect(() => {
    // Fetch the user's data from the backend
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/users/${user._id}`);
        setProfileData(response.data);
        setLoading(false);
        setNoLicense(!response.data.agentLicenseNumber); // Set initial state based on fetched data
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user._id]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setProfileData({ ...profileData, [id]: value });

    if (debounceTimer.current[id]) {
      clearTimeout(debounceTimer.current[id]);
    }

    debounceTimer.current[id] = setTimeout(async () => {
      setUpdating({ ...updating, [id]: true });
      try {
        await axios.put(`http://localhost:8000/api/users/${user._id}`, { [id]: value });
      } catch (error) {
        console.error('Error updating user data:', error);
      } finally {
        setUpdating({ ...updating, [id]: false });
      }
    }, 1000); // Adjust debounce delay as needed
  };

  const handlePhotoUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading({ ...isUploading, [field]: true });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('field', field);

    try {
      const response = await axios.put(`http://localhost:8000/api/users/${user._id}/upload-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedUser = response.data;
      setProfileData(updatedUser);
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setIsUploading({ ...isUploading, [field]: false });
    }
  };

  const handleCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setNoLicense(isChecked);
    if (isChecked) {
      setProfileData({ ...profileData, agentLicenseNumber: '' });
      setUpdating({ ...updating, agentLicenseNumber: true });
      axios.put(`http://localhost:8000/api/users/${user._id}`, { agentLicenseNumber: '' })
        .then(() => setUpdating({ ...updating, agentLicenseNumber: false }))
        .catch(error => {
          console.error('Error updating user data:', error);
          setUpdating({ ...updating, agentLicenseNumber: false });
        });
    }
  };

  const handleRoleChange = async (newRole) => {
    try {
      const updatedUser = await axios.put(`http://localhost:8000/api/users/${user._id}`, { role: newRole });
      setProfileData(updatedUser.data);
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleRoleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleClickOutside = (event) => {
    if (isDropdownOpen && !event.target.closest('.role-dropdown')) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (loading) return <ProfileSpinner />;

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
                  <label htmlFor="role">Role</label>
                  <div className="role-dropdown" onClick={handleRoleDropdownToggle}>
                    {profileData.role}
                  </div>
                  {isDropdownOpen && (
                    <div className="role-dropdown-menu">
                      {['agent', 'buyer', 'seller'].map((role) => (
                        <div key={role} onClick={() => handleRoleChange(role)}>
                          {role}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    value={profileData.firstName || ''}
                    onChange={handleInputChange}
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
                  />
                  {updating.lastName && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <div className="email-group">
                    <input
                      type="email"
                      id="email"
                      value={profileData.email || ''}
                      onChange={handleInputChange}
                    />
                    <button className="edit-button">Edit</button>
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
                  <input
                    type="text"
                    id="phone"
                    value={profileData.phone || ''}
                    onChange={handleInputChange}
                  />
                  {updating.phone && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="addressLine1">Address Line 1</label>
                  <input
                    type="text"
                    id="addressLine1"
                    value={profileData.addressLine1 || ''}
                    onChange={handleInputChange}
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
                  />
                  {updating.addressLine2 && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="homepage">Homepage</label>
                  <input
                    type="text"
                    id="homepage"
                    value={profileData.homepage || ''}
                    onChange={handleInputChange}
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
                  />
                  {updating.brokerageLicenseNumber && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="brokeragePhoneNumber">Phone Number</label>
                  <input
                    type="text"
                    id="brokeragePhoneNumber"
                    value={profileData.brokeragePhoneNumber || ''}
                    onChange={handleInputChange}
                  />
                  {updating.brokeragePhoneNumber && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="agencyAddressLine1">Address Line 1</label>
                  <input
                    type="text"
                    id="agencyAddressLine1"
                    value={profileData.agencyAddressLine1 || ''}
                    onChange={handleInputChange}
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
                  />
                  {updating.agencyWebsite && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Profile;

