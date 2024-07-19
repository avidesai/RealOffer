// OfferToolBar.js

import React from 'react';
import OffersPagination from './OffersPagination';
import './OfferToolBar.css';

const OfferToolBar = ({ onAddOffer, onDownloadSummary, currentPage, totalPages, onPageChange }) => {
  return (
    <div className="offer-toolbar">
      <div className="toolbar-left">
        <button className="add-offer-button" onClick={onAddOffer}>
          Make an Offer
        </button>
        <button className="download-button" onClick={onDownloadSummary}>
          Download Summary
        </button>
      </div>
      <div className="toolbar-right">
        <OffersPagination currentPage={currentPage} pageCount={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
};

export default OfferToolBar;
