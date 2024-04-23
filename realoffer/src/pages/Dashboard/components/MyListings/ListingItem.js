// ListingItem.js

import React from 'react';
import './ListingItem.css';

function ListingItem({ listing }) {
  // ...
  return (
    <div className="listing-item">
      <img src={listing.imageUrl} alt={listing.address} className="listing-image" />
      <div className="listing-details">
        <h3 className="listing-title">{listing.address}</h3>
        <p className="listing-location">{listing.city}, {listing.state} {listing.zip}</p>
        <div className="listing-action-buttons">
          <button className="listing-button share">Share</button>
          <button className="listing-button archive">Archive</button>
        </div>
      </div>
      <div className="listing-agents">
        {listing.agents.map((agent, index) => (
          <img key={index} src={agent} alt="Agent" className="agent-image" />
        ))}
      </div>
    </div>
  );
}

export default ListingItem;
