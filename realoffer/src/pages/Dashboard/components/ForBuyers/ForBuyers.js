// ForBuyers.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import BuyerPackageItem from './components/BuyerPackageItem';
import BuyerPackageFilterSortBar from './components/BuyerPackageFilterSortBar';
import Pagination from '../MyListings/components/Pagination';
import './ForBuyers.css';

function ForBuyers() {
  const { user, token, logout } = useAuth();
  const BUYER_PACKAGES_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [buyerPackages, setBuyerPackages] = useState([]);
  const [filteredAndSortedPackages, setFilteredAndSortedPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBuyerPackages = useCallback(async () => {
    if ((user?._id || user?.id) && token) {
      setLoading(true);
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
        if (error.response && error.response.status === 401) {
          console.error('Failed to fetch buyer packages. Unauthorized:', error);
          setError('Unauthorized. Logging out.');
          logout();
        } else {
          console.error('Failed to fetch buyer packages:', error);
          // Don't set error for empty results, just set empty array
          setBuyerPackages([]);
        }
      }
      setLoading(false);
    } else {
      console.error('User ID or token is missing');
      setError('Authentication error. Please log in again.');
    }
  }, [user, token, logout]);

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
        filteredPackages = filteredPackages.sort((a, b) => b.propertyListing.homeCharacteristics.price - a.propertyListing.homeCharacteristics.price);
      } else if (sort === 'price-low') {
        filteredPackages = filteredPackages.sort((a, b) => a.propertyListing.homeCharacteristics.price - b.propertyListing.homeCharacteristics.price);
      }

      setFilteredAndSortedPackages(filteredPackages);
    };

    filterAndSortPackages();
  }, [buyerPackages, filter, sort, searchQuery]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleStatusChange = async (packageId, newStatus) => {
    setLoading(true);
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${packageId}/status`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      await fetchBuyerPackages();
    } catch (error) {
      console.error('Failed to update buyer package status:', error);
      setError('Failed to update buyer package status. Please try again.');
    }
    setLoading(false);
  };

  const pageCount = Math.ceil(filteredAndSortedPackages.length / BUYER_PACKAGES_PER_PAGE);
  const startIndex = (currentPage - 1) * BUYER_PACKAGES_PER_PAGE;
  const currentPackages = filteredAndSortedPackages.slice(startIndex, startIndex + BUYER_PACKAGES_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="for-buyers">
      {error ? (
        <div className="for-buyers-error">{error}</div>
      ) : (
        <>
          <BuyerPackageFilterSortBar
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onSearch={handleSearch}
          />
          {currentPackages.length > 0 ? currentPackages.map(buyerPackage => (
            <BuyerPackageItem 
              key={buyerPackage._id} 
              buyerPackage={buyerPackage} 
              onStatusChange={handleStatusChange} 
            />
          )) : <div>No buyer packages found.</div>}
          {pageCount > 1 && (
            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

export default ForBuyers; 