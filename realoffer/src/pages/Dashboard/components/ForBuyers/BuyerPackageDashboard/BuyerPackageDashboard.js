// BuyerPackageDashboard.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../../context/AuthContext';
import BuyerPackageDashboardHeader from './Header/BuyerPackageDashboardHeader';
import BuyerPackageListingOverview from './components/BuyerPackageListingOverview/BuyerPackageListingOverview';
import BuyerPackageTabSection from './components/BuyerPackageTabSection/BuyerPackageTabSection';
import Footer from '../../../../../components/Footer/Footer';
import FeedbackWidget from '../../../../../components/FeedbackWidget/FeedbackWidget';
import './BuyerPackageDashboard.css';

function BuyerPackageDashboard() {
  const { id } = useParams();
  const [buyerPackage, setBuyerPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const fetchBuyerPackageDetails = async () => {
      if (!token) {
        console.error('No authentication token available');
        setError('Authentication error. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        // Track view when accessing from ForBuyers section (buyer accessing their own package)
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${id}?trackView=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Fetched buyer package details:', response.data);
        setBuyerPackage(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching buyer package details:', error);
        
        // Handle the case where the listing has been deleted
        if (error.response?.status === 404 && error.response?.data?.deleted) {
          setError('This property listing is no longer available. The listing has been removed by the listing agent.');
        } else {
          setError('Failed to fetch buyer package details. Please try again.');
        }
        setLoading(false);
      }
    };

    fetchBuyerPackageDetails();
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

  if (!buyerPackage) {
    return (
      <div className="not-found-container">
        <p>Buyer package not found.</p>
        <button onClick={handleBackClick}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="buyer-package-dashboard">
      <BuyerPackageDashboardHeader onBackClick={handleBackClick} />
      <div className="buyer-package-dashboard-content">
        <BuyerPackageListingOverview buyerPackage={buyerPackage} />
        <BuyerPackageTabSection buyerPackage={buyerPackage} />
      </div>
      <Footer />
      <FeedbackWidget />
    </div>
  );
}

export default BuyerPackageDashboard; 