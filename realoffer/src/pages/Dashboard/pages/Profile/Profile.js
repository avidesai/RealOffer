import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Fetch the user's data from the backend
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/users/${user._id}`);
        setProfileData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user._id]);

  const handleInputChange = async (e) => {
    const { id, value } = e.target;
    setProfileData({ ...profileData, [id]: value });

    setUpdating({ ...updating, [id]: true });

    try {
      await axios.put(`/api/users/${user._id}`, { [id]: value });
    } catch (error) {
      console.error('Error updating user data:', error);
    } finally {
      setUpdating({ ...updating, [id]: false });
    }
  };

  if (loading) return <ProfileSpinner />;

  return (
    <>
      <ProfileHeader />
      <div className="profile-background">
        <div className="profile-container">
          <h2 className="profile-title">Settings</h2>
          <div className="profile-content">
            <div className="profile-section">
              <h3>Contact Information</h3>
              <div className="profile-form">
                <div className="form-group">
                  <label htmlFor="profilePhotoUrl">Profile Photo</label>
                  <img src={profileData.profilePhotoUrl} alt={`${profileData.firstName} ${profileData.lastName}`} className="profile-photo" />
                  <button className="upload-button">Replace Photo</button>
                </div>
                <div className="form-group">
                  <label htmlFor="firstName">Name</label>
                  <input type="text" id="firstName" value={profileData.firstName || ''} onChange={handleInputChange} />
                  {updating.firstName && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" value={profileData.email || ''} onChange={handleInputChange} />
                  {updating.email && <div className="input-spinner"></div>}
                  <button className="edit-button">Edit</button>
                </div>
                <div className="form-group">
                  <label htmlFor="agentLicenseNumber">License Number</label>
                  <input type="text" id="agentLicenseNumber" value={profileData.agentLicenseNumber || ''} onChange={handleInputChange} />
                  {updating.agentLicenseNumber && <div className="input-spinner"></div>}
                  <label className="checkbox-label">
                    <input type="checkbox" /> I do not have a real estate license number
                  </label>
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input type="text" id="phone" value={profileData.phone || ''} onChange={handleInputChange} />
                  {updating.phone && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="addressLine1">Address Line 1</label>
                  <input type="text" id="addressLine1" value={profileData.addressLine1 || ''} onChange={handleInputChange} />
                  {updating.addressLine1 && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="addressLine2">Address Line 2</label>
                  <input type="text" id="addressLine2" value={profileData.addressLine2 || ''} onChange={handleInputChange} />
                  {updating.addressLine2 && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="agencyWebsite">Homepage</label>
                  <input type="text" id="agencyWebsite" value={profileData.agencyWebsite || ''} onChange={handleInputChange} />
                  {updating.agencyWebsite && <div className="input-spinner"></div>}
                </div>
              </div>
            </div>
            <div className="profile-section">
              <h3>Brokerage Information</h3>
              <div className="profile-form">
                <div className="form-group">
                  <label htmlFor="agencyPhotoUrl">Agency Photo</label>
                  <img src={profileData.agencyPhotoUrl} alt={profileData.agencyName} className="agency-photo" />
                  <button className="upload-button">Upload Photo</button>
                </div>
                <div className="form-group">
                  <label htmlFor="agencyName">Name</label>
                  <input type="text" id="agencyName" value={profileData.agencyName || ''} onChange={handleInputChange} />
                  {updating.agencyName && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="agencyLicenseNumber">License Number</label>
                  <input type="text" id="agencyLicenseNumber" value={profileData.agencyLicenseNumber || ''} onChange={handleInputChange} />
                  {updating.agencyLicenseNumber && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="agencyPhone">Phone Number</label>
                  <input type="text" id="agencyPhone" value={profileData.agencyPhone || ''} onChange={handleInputChange} />
                  {updating.agencyPhone && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="agencyAddressLine1">Address Line 1</label>
                  <input type="text" id="agencyAddressLine1" value={profileData.agencyAddressLine1 || ''} onChange={handleInputChange} />
                  {updating.agencyAddressLine1 && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="agencyAddressLine2">Address Line 2</label>
                  <input type="text" id="agencyAddressLine2" value={profileData.agencyAddressLine2 || ''} onChange={handleInputChange} />
                  {updating.agencyAddressLine2 && <div className="input-spinner"></div>}
                </div>
                <div className="form-group">
                  <label htmlFor="agencyWebsite">Homepage</label>
                  <input type="text" id="agencyWebsite" value={profileData.agencyWebsite || ''} onChange={handleInputChange} />
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
