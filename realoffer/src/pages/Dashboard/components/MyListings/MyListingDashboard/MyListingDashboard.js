import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MyListingDashboardHeader from './Header/MyListingDashboardHeader';
import ListingOverview from './components/ListingOverview/ListingOverview';
import TabSection from './components/TabSection/TabSection';
import Footer from '../../Footer/Footer';
import './MyListingDashboard.css';

function MyListingDashboard() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/propertyListings/${id}`);
        setListing(response.data);
        setLoading(false); // Set loading to false after data is fetched
      } catch (error) {
        console.error('Error fetching listing details:', error);
        setLoading(false); // Ensure loading is set to false even if there's an error
      }
    };

    fetchListingDetails();
  }, [id]);

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
      <MyListingDashboardHeader />
      <div className="my-listing-dashboard-content">
        <button className="back-to-dashboard" onClick={handleBackClick}>
          &larr; Back to Dashboard
        </button>
        <ListingOverview listing={listing} />
        <TabSection />
      </div>
      <Footer />
    </div>
  );
}

export default MyListingDashboard;
