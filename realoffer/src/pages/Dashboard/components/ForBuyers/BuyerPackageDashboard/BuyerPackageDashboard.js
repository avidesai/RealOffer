// BuyerPackageDashboard.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../../../context/AuthContext';
import BuyerPackageDashboardHeader from './Header/BuyerPackageDashboardHeader';
import BuyerPackageListingOverview from './components/BuyerPackageListingOverview/BuyerPackageListingOverview';
import BuyerPackageTabSection from './components/BuyerPackageTabSection/BuyerPackageTabSection';
import Footer from '../../../../../components/Footer/Footer';
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
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Fetched buyer package details:', response.data);
        setBuyerPackage(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching buyer package details:', error);
        setError('Failed to fetch buyer package details. Please try again.');
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
    </div>
  );
}

export default BuyerPackageDashboard; 