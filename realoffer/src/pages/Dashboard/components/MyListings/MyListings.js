import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext'; // Adjust the path as necessary to import useAuth
import ListingItem from './components/ListingItem';
import ListingFilterSortBar from './components/ListingFilterSortBar';
import Pagination from './components/Pagination';
import './MyListings.css';

function MyListings({ onCreatePackageClick }) {
  const { user } = useAuth();
  const LISTINGS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (user?._id) {
        try {
          const response = await axios.get(`http://localhost:8000/api/users/${user._id}/listingPackages`);
          setListings(response.data.listingPackages); // Set the fetched listing packages into state
        } catch (error) {
          console.error('Failed to fetch user details:', error);
        }
      }
    };

    fetchUserDetails();
  }, [user]);

  const pageCount = Math.ceil(listings.length / LISTINGS_PER_PAGE);
  const startIndex = (currentPage - 1) * LISTINGS_PER_PAGE;
  const currentListings = listings.slice(startIndex, startIndex + LISTINGS_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="my-listings">
      <div className="create-property-package">
        <button className="create-package-button" onClick={onCreatePackageClick}>
          Create Listing Package
        </button>
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
