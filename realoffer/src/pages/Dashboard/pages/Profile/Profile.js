import React from 'react';
import { useAuth } from '../../../../context/AuthContext';
import ProfileHeader from './components/ProfileHeader';
import Footer from '../../components/Footer/Footer';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();

  return (
    <>
      <ProfileHeader />
      <div className="profile-container">
        <div className="profile-header">
          <img src={user.profilePhotoUrl} alt={`${user.firstName} ${user.lastName}`} className="profile-photo" />
          <div className="profile-info">
            <h1>{user.firstName} {user.lastName}</h1>
            <p className="profile-role">{user.role}</p>
          </div>
        </div>
        <div className="profile-details">
          <div className="profile-section">
            <h2>Contact Information</h2>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Phone:</strong> {user.phone}</p>
            <p><strong>Address:</strong> {user.addressLine1} {user.addressLine2}</p>
          </div>
          <div className="profile-section">
            <h2>Agency Information</h2>
            <p><strong>Agency Name:</strong> {user.agencyName}</p>
            <p><strong>License Number:</strong> {user.agentLicenseNumber}</p>
            <p><strong>Website:</strong> <a href={user.agencyWebsite} target="_blank" rel="noopener noreferrer">{user.agencyWebsite}</a></p>
          </div>
          <div className="profile-section">
            <h2>Social Media</h2>
            <p><strong>LinkedIn:</strong> <a href={user.linkedIn} target="_blank" rel="noopener noreferrer">{user.linkedIn}</a></p>
            <p><strong>Twitter:</strong> <a href={user.twitter} target="_blank" rel="noopener noreferrer">{user.twitter}</a></p>
            <p><strong>Facebook:</strong> <a href={user.facebook} target="_blank" rel="noopener noreferrer">{user.facebook}</a></p>
          </div>
          <div className="profile-section">
            <h2>About Me</h2>
            <p>{user.bio}</p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Profile;
