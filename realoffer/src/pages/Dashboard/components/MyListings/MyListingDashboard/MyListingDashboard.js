// MyListingDashboard.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import MyListingDashboardHeader from './Header/MyListingDashboardHeader';
import ListingOverview from './components/ListingOverview/ListingOverview';
import TabSection from './components/TabSection/TabSection';
import Footer from '../../Footer/Footer';
import './MyListingDashboard.css';

function MyListingDashboard() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setListing(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching listing details:', error);
        setLoading(false);
      }
    };

    if (token) {
      fetchListingDetails();
    }
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