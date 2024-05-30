import React, { useState, useEffect } from 'react';
import BuyerItem from './components/BuyerItem';
import BuyerFilterSortBar from './components/BuyerFilterSortBar';
import Pagination from './components/Pagination';
import './ForBuyers.css';

function ForBuyers() {
  const LISTINGS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/buyer_listings')
      .then(response => response.json())
      .then(data => setListings(data));
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
      <BuyerFilterSortBar />
      {currentListings.map(listing => (
        <BuyerItem key={listing._id} listing={listing} />
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
