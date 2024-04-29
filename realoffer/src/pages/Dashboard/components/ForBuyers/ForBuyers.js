// src/pages/Dashboard/components/ForBuyers/ForBuyers.js
import React, { useState, useEffect } from 'react';
import ListingItem from './components/ListingItem';
import ListingFilterSortBar from './components/ListingFilterSortBar';
import Pagination from './components/Pagination';
import './ForBuyers.css';

function ForBuyers() {
  const LISTINGS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch('http://localhost:8000/listings');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setListings(data);
      } catch (error) {
        console.error("Could not fetch listings:", error);
      }
    };

    fetchListings();
  }, []);

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
        <ListingItem key={listing._id} listing={listing} /> // Use _id as key
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
