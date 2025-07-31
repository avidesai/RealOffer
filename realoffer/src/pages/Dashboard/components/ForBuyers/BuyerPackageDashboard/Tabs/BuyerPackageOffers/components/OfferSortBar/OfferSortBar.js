// OfferSortBar.js

import React, { useState } from 'react';
import './OfferSortBar.css';
import OffersPagination from './OffersPagination';

function OfferSortBar({ onFilterChange, onSortChange, onAddOffer, currentPage, totalPages, onPageChange, statusCounts }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('priceHighToLow');

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    onFilterChange(e.target.value);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    onSortChange(e.target.value);
  };

  // SVG down arrow for custom dropdown
  const downArrow =
    'data:image/svg+xml;utf8,<svg fill="%237a8595" height="18" viewBox="0 0 20 20" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>';

  return (
    <div className="offer-sort-bar-wrapper">
      <div className="offer-sort-bar improved-offer-sort-bar">
        <div className="offer-sort-bar-top-row">
          <div className="filter-sort-section">
            <div className="offer-filter-section">
              <label htmlFor="filter" className="offer-sortbar-label">Status</label>
              <select
                id="filter"
                value={filter}
                onChange={handleFilterChange}
                className="offer-sortbar-select custom-dropdown"
                style={{ backgroundImage: `url(${downArrow})` }}
              >
                <option value="all">All ({statusCounts.all})</option>
                <option value="submitted">Pending Review ({statusCounts.submitted})</option>
                <option value="under review">Under Review ({statusCounts['under review']})</option>
                <option value="rejected">Rejected ({statusCounts.rejected})</option>
                <option value="countered">Countered ({statusCounts.countered})</option>
                <option value="accepted">Accepted ({statusCounts.accepted})</option>
                <option value="pending-signatures">Pending Signatures ({statusCounts['pending-signatures']})</option>
                <option value="pending-review">Documents Signed ({statusCounts['pending-review']})</option>
                <option value="documents-declined">Documents Declined ({statusCounts['documents-declined']})</option>
                <option value="documents-voided">Documents Voided ({statusCounts['documents-voided']})</option>
              </select>
            </div>
            <div className="offer-sort-section">
              <label htmlFor="sort" className="offer-sortbar-label">Sort</label>
              <select
                id="sort"
                value={sort}
                onChange={handleSortChange}
                className="offer-sortbar-select custom-dropdown"
                style={{ backgroundImage: `url(${downArrow})` }}
              >
                <option value="priceHighToLow">Price (High to Low)</option>
                <option value="recent">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="offerExpiryDate">Expiring Soon</option>
              </select>
            </div>
          </div>
        </div>
        <div className="offer-sortbar-divider tight-divider"></div>
        <div className="offer-sort-bar-bottom-row">
          <button className="add-offer-button" onClick={onAddOffer}>
            Make an Offer
          </button>
          <OffersPagination currentPage={currentPage} pageCount={totalPages} onPageChange={onPageChange} />
        </div>
      </div>
    </div>
  );
}

export default OfferSortBar;
