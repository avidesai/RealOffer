// MyListingDashboard.js

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import MyListingDashboardHeader from './Header/MyListingDashboardHeader';
import './MyListingDashboard.css';

function MyListingDashboard() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);

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

  return (
    <div>
      <MyListingDashboardHeader />
      <div className="my-listing-dashboard">
        <h1>{listing.homeCharacteristics.address}</h1>
        <p>City: {listing.homeCharacteristics.city}</p>
        <p>State: {listing.homeCharacteristics.state}</p>
        <p>Zip: {listing.homeCharacteristics.zip}</p>
        <p>Price: ${listing.homeCharacteristics.price}</p>
        <p>Beds: {listing.homeCharacteristics.beds}</p>
        <p>Baths: {listing.homeCharacteristics.baths}</p>
        <p>Square Footage: {listing.homeCharacteristics.squareFootage}</p>
        <p>Lot Size: {listing.homeCharacteristics.lotSize}</p>
        <p>Year Built: {listing.homeCharacteristics.yearBuilt}</p>
        <p>Description: {listing.description}</p>
        <div>
          <h3>Agents:</h3>
          {listing.agentIds.map(agent => (
            <p key={agent}>{agent}</p>
          ))}
        </div>
        <div>
          <h3>Images:</h3>
          {listing.imagesUrls.map((url, index) => (
            <img key={index} src={url} alt="Property" style={{ width: '100px', height: '100px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyListingDashboard;
