// MyListings.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import ListingItem from './components/ListingItem';
import ListingFilterSortBar from './components/ListingFilterSortBar';
import Pagination from './components/Pagination';
import CreateListingPackageLogic from './CreateListingPackage/CreateListingPackageLogic';
import './MyListings.css';

function MyListings() {
  const { user, token, logout } = useAuth(); // Added logout to handle 401 errors
  const LISTINGS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [listings, setListings] = useState([]);
  const [filteredAndSortedListings, setFilteredAndSortedListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('recent');

  const fetchUserDetails = useCallback(async () => {
    if ((user?._id || user?.id) && token) {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Fetched listings:', response.data); // Debug log
        setListings(response.data);
        setError('');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // If token is invalid, log out the user and redirect to login
          console.error('Failed to fetch user listings. Unauthorized:', error);
          setError('Unauthorized. Logging out.');
          logout(); // Logout the user if token is invalid
        } else {
          console.error('Failed to fetch user listings:', error);
          setError('No listings found or error fetching listings.');
        }
      }
      setLoading(false);
    } else {
      console.error('User ID or token is missing');
      setError('Authentication error. Please log in again.');
    }
  }, [user, token, logout]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  useEffect(() => {
    const filterAndSortListings = () => {
      let filteredListings = listings;
      if (filter === 'active') {
        filteredListings = listings.filter(listing => listing.status === 'active');
      } else if (filter === 'archived') {
        filteredListings = listings.filter(listing => listing.status === 'archived');
      }

      // Sort by updatedAt
      if (sort === 'recent') {
        filteredListings = filteredListings.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      } else if (sort === 'oldest') {
        filteredListings = filteredListings.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      }

      setFilteredAndSortedListings(filteredListings);
    };

    filterAndSortListings();
  }, [listings, filter, sort]);

  const addNewListing = (newListing) => {
    setListings((prevListings) => [newListing, ...prevListings]);
  };

  const pageCount = Math.ceil(filteredAndSortedListings.length / LISTINGS_PER_PAGE);
  const startIndex = (currentPage - 1) * LISTINGS_PER_PAGE;
  const currentListings = filteredAndSortedListings.slice(startIndex, startIndex + LISTINGS_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleCreateListingClick = () => {
    setShowCreateListingModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateListingModal(false);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
  };

  const handleStatusChange = async (listingId, newStatus) => {
    setLoading(true);
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      await fetchUserDetails();
    } catch (error) {
      console.error('Failed to update listing status:', error);
      setError('Failed to update listing status. Please try again.');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="my-listings">
      <div className="create-property-package">
        <button className="create-package-button" onClick={handleCreateListingClick}>
          Create Listing Package
        </button>
      </div>
      {error ? (
        <div className="mylistings">{error}</div>
      ) : (
        <>
          <ListingFilterSortBar
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onSearch={() => {}} // Keeping the search function as a placeholder
          />
          {currentListings.length > 0 ? currentListings.map(listing => (
            <ListingItem key={listing._id} listing={listing} onStatusChange={handleStatusChange} />
          )) : <div>No listings found.</div>}
          {pageCount > 1 && (
            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
      {showCreateListingModal && (
        <CreateListingPackageLogic onClose={handleCloseModal} addNewListing={addNewListing} />
      )}
    </div>
  );
}

export default MyListings;
