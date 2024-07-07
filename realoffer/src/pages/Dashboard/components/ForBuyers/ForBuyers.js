import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import BuyerItem from './components/BuyerItem';
import BuyerFilterSortBar from './components/BuyerFilterSortBar';
import Pagination from './components/Pagination';
import CreateBuyerPackageLogic from './CreateBuyerPackage/CreateBuyerPackageLogic';
import './ForBuyers.css';

function ForBuyers({ onCreatePackageClick }) {
  const { user } = useAuth();
  const PACKAGES_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [buyerPackages, setBuyerPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateBuyerModal, setShowCreateBuyerModal] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (user?._id) {
        setLoading(true);
        try {
          const response = await axios.get(`http://localhost:8000/api/users/${user._id}/buyerPackages`);
          setBuyerPackages(response.data);
          setError(''); // Reset the error on successful fetch
        } catch (error) {
          console.error('Failed to fetch user details:', error);
          setError('No buyer packages found.');
        }
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user]);

  const addNewBuyerPackage = (newBuyerPackage) => {
    setBuyerPackages((prevPackages) => [newBuyerPackage, ...prevPackages]);
  };

  const pageCount = Math.ceil(buyerPackages.length / PACKAGES_PER_PAGE);
  const startIndex = (currentPage - 1) * PACKAGES_PER_PAGE;
  const currentPackages = buyerPackages.slice(startIndex, startIndex + PACKAGES_PER_PAGE);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleCreateBuyerClick = () => {
    setShowCreateBuyerModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateBuyerModal(false);
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
      <div className="create-buyer-package">
        <button className="create-package-button" onClick={handleCreateBuyerClick}>
          Create Buyer Package
        </button>
      </div>
      {error ? (
        <div className="forbuyers-error">{error}</div>
      ) : (
        <>
          <BuyerFilterSortBar />
          {currentPackages.length > 0 ? currentPackages.map(pkg => (
            <BuyerItem key={pkg._id} listing={pkg} />
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
      {showCreateBuyerModal && (
        <CreateBuyerPackageLogic onClose={handleCloseModal} addNewBuyerPackage={addNewBuyerPackage} />
      )}
    </div>
  );
}

export default ForBuyers;
