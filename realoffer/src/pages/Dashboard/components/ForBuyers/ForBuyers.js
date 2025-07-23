// ForBuyers.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import BuyerPackageFilterSortBar from './components/BuyerPackageFilterSortBar';
import BuyerPackageItem from './components/BuyerPackageItem';
import Pagination from '../MyListings/components/Pagination';
import './ForBuyers.css';

const BUYER_PACKAGES_PER_PAGE = 10;

function ForBuyers() {
  const [buyerPackages, setBuyerPackages] = useState([]);
  const [filteredAndSortedPackages, setFilteredAndSortedPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const { user, token, logout } = useAuth();

  const fetchBuyerPackages = useCallback(async () => {
    if ((user?._id || user?.id) && token) {
      setLoading(true);
      setError('');
      
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log('Fetched buyer packages:', response.data);
        setBuyerPackages(response.data);
        setError('');
      } catch (error) {
        console.error('Failed to fetch buyer packages:', error);
        
        if (error.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
          logout();
        } else if (error.response?.status === 403) {
          setError('You do not have permission to access buyer packages.');
        } else if (error.response?.status === 404) {
          setError('Buyer packages service not found.');
        } else if (error.response?.status >= 500) {
          setError('Server error. Please try again later.');
        } else if (error.code === 'NETWORK_ERROR') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Failed to load buyer packages. Please try again.');
        }
        
        // Don't clear existing packages on error, just show the error message
        if (buyerPackages.length === 0) {
          setBuyerPackages([]);
        }
      } finally {
        setLoading(false);
      }
    } else {
      console.error('User ID or token is missing');
      setError('Authentication error. Please log in again.');
      setBuyerPackages([]);
      setLoading(false);
    }
  }, [user, token, logout, buyerPackages.length]);

  useEffect(() => {
    fetchBuyerPackages();
  }, [fetchBuyerPackages]);

  useEffect(() => {
    const filterAndSortPackages = () => {
      let filteredPackages = buyerPackages;
      
      // Apply filter
      if (filter === 'active') {
        filteredPackages = buyerPackages.filter(pkg => pkg.status === 'active');
      } else if (filter === 'archived') {
        filteredPackages = buyerPackages.filter(pkg => pkg.status === 'archived');
      }

      // Apply search
      if (searchQuery.trim()) {
        filteredPackages = filteredPackages.filter(pkg => {
          const searchTerm = searchQuery.toLowerCase().trim();
          
          // Create a comprehensive search string that includes all address components
          const fullAddress = [
            pkg.propertyListing?.homeCharacteristics?.address,
            pkg.propertyListing?.homeCharacteristics?.city,
            pkg.propertyListing?.homeCharacteristics?.state,
            pkg.propertyListing?.homeCharacteristics?.zip,
            pkg.propertyListing?.homeCharacteristics?.county
          ]
            .filter(Boolean) // Remove null/undefined values
            .join(' ')
            .toLowerCase();
          
          // Search through individual fields and combined address
          return (
            pkg.propertyListing?.homeCharacteristics?.address?.toLowerCase().includes(searchTerm) ||
            pkg.propertyListing?.homeCharacteristics?.city?.toLowerCase().includes(searchTerm) ||
            pkg.propertyListing?.homeCharacteristics?.state?.toLowerCase().includes(searchTerm) ||
            pkg.propertyListing?.homeCharacteristics?.zip?.toLowerCase().includes(searchTerm) ||
            pkg.propertyListing?.homeCharacteristics?.county?.toLowerCase().includes(searchTerm) ||
            fullAddress.includes(searchTerm) || // Search the combined address string
            // Handle partial matches for addresses like "117 Panorama" matching "117 Panorama Way"
            searchTerm.split(' ').every(word => fullAddress.includes(word))
          );
        });
      }

      // Sort packages
      if (sort === 'recent') {
        filteredPackages = filteredPackages.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      } else if (sort === 'oldest') {
        filteredPackages = filteredPackages.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      } else if (sort === 'price-high') {
        filteredPackages = filteredPackages.sort((a, b) => 
          (b.propertyListing?.homeCharacteristics?.price || 0) - (a.propertyListing?.homeCharacteristics?.price || 0)
        );
      } else if (sort === 'price-low') {
        filteredPackages = filteredPackages.sort((a, b) => 
          (a.propertyListing?.homeCharacteristics?.price || 0) - (b.propertyListing?.homeCharacteristics?.price || 0)
        );
      }

      setFilteredAndSortedPackages(filteredPackages);
    };

    filterAndSortPackages();
  }, [buyerPackages, filter, sort, searchQuery]);

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

  const handleStatusChange = async (packageId, newStatus) => {
    setError('');
    
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${packageId}/status`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.data) {
        // Update the local state to reflect the change immediately
        setBuyerPackages(prevPackages => 
          prevPackages.map(pkg => 
            pkg._id === packageId 
              ? { ...pkg, status: newStatus }
              : pkg
          )
        );
      }
    } catch (error) {
      console.error('Failed to update buyer package status:', error);
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        logout();
      } else if (error.response?.status === 403) {
        setError('You do not have permission to update this buyer package.');
      } else if (error.response?.status === 404) {
        setError('Buyer package not found. It may have been deleted.');
      } else {
        setError('Failed to update buyer package status. Please try again.');
      }
    }
  };

  const pageCount = Math.ceil(filteredAndSortedPackages.length / BUYER_PACKAGES_PER_PAGE);
  const startIndex = (currentPage - 1) * BUYER_PACKAGES_PER_PAGE;
  const currentPackages = filteredAndSortedPackages.slice(startIndex, startIndex + BUYER_PACKAGES_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  if (loading) {
    return (
      <div className="for-buyers">
        <div className="for-buyers-loading">
          <div className="spinner"></div>
          <p>Loading your buyer packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="for-buyers">
      {error && (
        <div className="for-buyers-error">
          <p>{error}</p>
        </div>
      )}
      
      <BuyerPackageFilterSortBar
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onSearch={handleSearch}
        totalPackages={buyerPackages.length}
        filteredCount={filteredAndSortedPackages.length}
      />
      
      {currentPackages.length > 0 ? (
        <>
          {currentPackages.map(buyerPackage => (
            <BuyerPackageItem 
              key={buyerPackage._id} 
              buyerPackage={buyerPackage} 
              onStatusChange={handleStatusChange}
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
        <div className="for-buyers-empty">
          {searchQuery || filter !== 'all' ? (
            <>
              <p>No buyer packages match your current filters.</p>
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
              <p>You don't have any buyer packages yet.</p>
              <p>Browse public listings to create your first buyer package.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ForBuyers; 