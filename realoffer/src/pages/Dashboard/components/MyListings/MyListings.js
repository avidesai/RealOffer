// MyListings.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import ListingItem from './components/ListingItem';
import ListingFilterSortBar from './components/ListingFilterSortBar';
import Pagination from './components/Pagination';
import CreateListingPackageLogic from './CreateListingPackage/CreateListingPackageLogic';
import ShareUrl from './MyListingDashboard/components/ListingOverview/components/ShareUrl/ShareUrl';
import './MyListings.css';

function MyListings() {
  const { user, token, logout } = useAuth();
  const LISTINGS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [listings, setListings] = useState([]);
  const [filteredAndSortedListings, setFilteredAndSortedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareListingUrl, setShareListingUrl] = useState('');

  const fetchUserDetails = useCallback(async () => {
    if ((user?._id || user?.id) && token) {
      setLoading(true);
      setError('');
      
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Fetched listings:', response.data);
        setListings(response.data);
        setError('');
      } catch (error) {
        console.error('Failed to fetch user listings:', error);
        
        if (error.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
          logout();
        } else if (error.response?.status === 403) {
          setError('You do not have permission to access listings.');
        } else if (error.response?.status === 404) {
          setError('Listings service not found.');
        } else if (error.response?.status >= 500) {
          setError('Server error. Please try again later.');
        } else if (error.code === 'NETWORK_ERROR') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Failed to load listings. Please try again.');
        }
        
        // Don't clear existing listings on error, just show the error message
        if (listings.length === 0) {
          setListings([]);
        }
      } finally {
        setLoading(false);
      }
    } else {
      console.error('User ID or token is missing');
      setError('Authentication error. Please log in again.');
      setListings([]);
      setLoading(false);
    }
  }, [user, token, logout, listings.length]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  useEffect(() => {
    const filterAndSortListings = () => {
      let filteredListings = listings;
      
      // Apply filter
      if (filter === 'active') {
        filteredListings = listings.filter(listing => listing.status === 'active');
      } else if (filter === 'archived') {
        filteredListings = listings.filter(listing => listing.status === 'archived');
      }

      // Apply search
      if (searchQuery.trim()) {
        filteredListings = filteredListings.filter(listing => {
          const searchTerm = searchQuery.toLowerCase().trim();
          
          // Create a comprehensive search string that includes all address components
          const fullAddress = [
            listing.homeCharacteristics?.address,
            listing.homeCharacteristics?.city,
            listing.homeCharacteristics?.state,
            listing.homeCharacteristics?.zip,
            listing.homeCharacteristics?.county
          ]
            .filter(Boolean) // Remove null/undefined values
            .join(' ')
            .toLowerCase();
          
          // Search through individual fields and combined address
          return (
            listing.title?.toLowerCase().includes(searchTerm) ||
            listing.description?.toLowerCase().includes(searchTerm) ||
            listing.homeCharacteristics?.address?.toLowerCase().includes(searchTerm) ||
            listing.homeCharacteristics?.city?.toLowerCase().includes(searchTerm) ||
            listing.homeCharacteristics?.state?.toLowerCase().includes(searchTerm) ||
            listing.homeCharacteristics?.zip?.toLowerCase().includes(searchTerm) ||
            listing.homeCharacteristics?.county?.toLowerCase().includes(searchTerm) ||
            fullAddress.includes(searchTerm) || // Search the combined address string
            // Handle partial matches for addresses like "117 Panorama" matching "117 Panorama Way"
            searchTerm.split(' ').every(word => fullAddress.includes(word))
          );
        });
      }

      // Sort listings
      if (sort === 'recent') {
        filteredListings = filteredListings.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      } else if (sort === 'oldest') {
        filteredListings = filteredListings.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      } else if (sort === 'price-high') {
        filteredListings = filteredListings.sort((a, b) => 
          (b.homeCharacteristics?.price || 0) - (a.homeCharacteristics?.price || 0)
        );
      } else if (sort === 'price-low') {
        filteredListings = filteredListings.sort((a, b) => 
          (a.homeCharacteristics?.price || 0) - (b.homeCharacteristics?.price || 0)
        );
      }

      setFilteredAndSortedListings(filteredListings);
    };

    filterAndSortListings();
  }, [listings, filter, sort, searchQuery]);

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
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setCurrentPage(1); // Reset to first page when sort changes
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handleStatusChange = async (listingId, newStatus) => {
    setError('');
    
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.data) {
        // Update the local state to reflect the change immediately
        setListings(prevListings => 
          prevListings.map(listing => 
            listing._id === listingId 
              ? { ...listing, status: newStatus }
              : listing
          )
        );
      }
    } catch (error) {
      console.error('Failed to update listing status:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        logout();
      } else if (error.response?.status === 403) {
        setError('You do not have permission to update this listing.');
      } else if (error.response?.status === 404) {
        setError('Listing not found. It may have been deleted.');
      } else {
        setError('Failed to update listing status. Please try again.');
      }
    }
  };

  const handleShareListing = (listing) => {
    setShareListingUrl(listing.publicUrl);
    setShowShareModal(true);
  };

  if (loading) {
    return (
      <div className="my-listings">
        <div className="my-listings-loading">
          <div className="spinner"></div>
          <p>Loading your listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-listings">
      <div className="create-property-package">
        <button className="create-package-button" onClick={handleCreateListingClick}>
          Create New Listing
        </button>
      </div>
      
      {error && (
        <div className="my-listings-error">
          <p>{error}</p>
        </div>
      )}
      
      <ListingFilterSortBar
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onSearch={handleSearch}
        totalListings={listings.length}
        filteredCount={filteredAndSortedListings.length}
      />
      
      {currentListings.length > 0 ? (
        <>
          {currentListings.map(listing => (
            <ListingItem 
              key={listing._id} 
              listing={listing} 
              onStatusChange={handleStatusChange} 
              onShareListing={handleShareListing} 
            />
          ))}
          
          {pageCount > 1 && (
            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <div className="my-listings-empty">
          {searchQuery || filter !== 'all' ? (
            <>
              <p>No listings match your current filters.</p>
              <button onClick={() => {
                setSearchQuery('');
                setFilter('all');
                setCurrentPage(1);
              }}>
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <p>You don't have any listings yet.</p>
              <p>Create your first listing to get started.</p>
            </>
          )}
        </div>
      )}
      
      {showCreateListingModal && (
        <CreateListingPackageLogic onClose={handleCloseModal} addNewListing={addNewListing} />
      )}
      {showShareModal && (
        <ShareUrl
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          url={shareListingUrl}
        />
      )}
    </div>
  );
}

export default MyListings;
