import React from 'react';
import './ListingItem.css';

function ListingItem({ listing }) {
  return (
    <div className="listing-item">
      <img src={listing.imagesUrls[0]} alt={`${listing.homeCharacteristics.address} view`} className="listing-image" />
      <div className="listing-details">
        <h3 className="listing-title">{listing.homeCharacteristics.address}</h3>
        <p className="listing-location">{listing.homeCharacteristics.city}, {listing.homeCharacteristics.state} {listing.homeCharacteristics.zip}</p>
        <div className="listing-action-buttons">
          <button className="listing-button share">Share</button>
          <button className="listing-button archive">Archive</button>
        </div>
      </div>
      {/* Example: Assuming agents are linked by an ID and need further fetching or mapping */}
      <div className="listing-agents">
        {/* Render agents if necessary */}
      </div>
    </div>
  );
}

export default ListingItem;
