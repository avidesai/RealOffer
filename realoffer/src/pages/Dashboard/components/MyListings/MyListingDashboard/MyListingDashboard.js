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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/propertyListings/${id}`);
        setListing(response.data);
      } catch (error) {
        console.error('Error fetching listing details:', error);
      }
    };

    fetchListingDetails();
  }, [id]);

  if (!listing) {
    return <div>Loading...</div>;
  }

  const handleBackClick = () => {
    navigate('/dashboard');
  };

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
