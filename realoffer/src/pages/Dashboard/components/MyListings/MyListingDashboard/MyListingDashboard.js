// MyListingDashboard.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../../context/AuthContext';
import MyListingDashboardHeader from './Header/MyListingDashboardHeader';
import ListingOverview from './components/ListingOverview/ListingOverview';
import TabSection from './components/TabSection/TabSection';
import Footer from '../../Footer/Footer';
import './MyListingDashboard.css';

function MyListingDashboard() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const fetchListingDetails = async () => {
      if (!token) {
        console.error('No authentication token available');
        setError('Authentication error. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching listing details for ID:', id);
        console.log('Using token:', token ? 'Present' : 'Missing');
        
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Fetched listing details:', response.data); // Debug log
        setListing(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching listing details:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        
        if (error.response?.status === 403) {
          setError('You do not have permission to access this listing. Please contact the listing agent.');
        } else if (error.response?.status === 404) {
          setError('Listing not found. It may have been removed or you may not have access.');
        } else {
          setError('Failed to fetch listing details. Please try again.');
        }
        setLoading(false);
      }
    };

    fetchListingDetails();
  }, [id, token]);

  const handleBackClick = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={handleBackClick}>Back to Dashboard</button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="not-found-container">
        <p>Listing not found.</p>
        <button onClick={handleBackClick}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="my-listing-dashboard">
      <MyListingDashboardHeader onBackClick={handleBackClick} />
      <div className="my-listing-dashboard-content">
        <ListingOverview listing={listing} />
        <TabSection listing={listing} />
      </div>
      <Footer />
    </div>
  );
}

export default MyListingDashboard;