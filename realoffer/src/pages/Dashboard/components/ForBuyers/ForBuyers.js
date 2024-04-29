// src/pages/Dashboard/components/ForBuyers/ForBuyers.js

import React, { useState } from 'react';
import ListingItem from './components/ListingItem';
import ListingFilterSortBar from './components/ListingFilterSortBar';
import Pagination from './components/Pagination';
import './ForBuyers.css'; // Create this new stylesheet

import house1 from './images/house1.jpeg';
import agent1 from './images/agent1.jpg';

function ForBuyers() {
  const LISTINGS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const listings = [
    {
      id: 1,
      address: '6107 Montgomery Court',
      city: 'San Jose',
      state: 'CA',
      zip: '95135',
      imageUrl: house1,
      agents: [agent1],
      isNew: false,
    },
    // Additional listings...
  ];

  const pageCount = Math.ceil(listings.length / LISTINGS_PER_PAGE);

  const startIndex = (currentPage - 1) * LISTINGS_PER_PAGE;
  const currentListings = listings.slice(startIndex, startIndex + LISTINGS_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="for-buyers">
      <div className="create-buyer-package">
        <button className="create-package-button">Create Buyer Package</button>
      </div>
      <ListingFilterSortBar />
      {currentListings.map(listing => (
        <ListingItem key={listing.id} listing={listing} />
      ))}
      {pageCount > 1 && (
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

export default ForBuyers;
