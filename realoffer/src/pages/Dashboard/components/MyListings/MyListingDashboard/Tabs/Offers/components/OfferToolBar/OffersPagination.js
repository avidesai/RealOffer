// OffersPagination.js

import React from 'react';
import './OffersPagination.css';

function OffersPagination({ currentPage, pageCount, onPageChange }) {
  return (
    <div className="offers-pagination">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNumber => (
        <button
          key={pageNumber}
          className={`offers-page-item ${currentPage === pageNumber ? 'active' : ''}`}
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}
    </div>
  );
}

export default OffersPagination;
