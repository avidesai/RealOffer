import React, { useState, useEffect } from 'react';
import ListingItem from './components/ListingItem';
import ListingFilterSortBar from './components/ListingFilterSortBar';
import Pagination from './components/Pagination';
import './MyListings.css';

function MyListings() {
  const LISTINGS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [listings, setListings] = useState([]);

  // Adjusted to the correct endpoint or temporarily removed if not applicable
  // useEffect(() => {
  //   fetch('http://localhost:8000/api/your_correct_endpoint')
  //     .then(response => response.json())
  //     .then(data => setListings(data));
  // }, []);

  const pageCount = Math.ceil(listings.length / LISTINGS_PER_PAGE);
  const startIndex = (currentPage - 1) * LISTINGS_PER_PAGE;
  const currentListings = listings.slice(startIndex, startIndex + LISTINGS_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="my-listings">
      <div className="create-property-package">
        <button className="create-package-button">Create Property Package</button>
      </div>
      <ListingFilterSortBar />
      {currentListings.map(listing => (
        <ListingItem key={listing._id} listing={listing} />
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

export default MyListings;
