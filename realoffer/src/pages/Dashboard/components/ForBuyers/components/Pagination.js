// Pagination.js
import React from 'react';
import './Pagination.css';

function Pagination({ currentPage, pageCount, onPageChange }) {
  return (
    <div className="pagination">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNumber => (
        <button
          key={pageNumber}
          className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}
    </div>
  );
}

export default Pagination;
