// src/pages/Dashboard/components/ForBuyers/components/BuyerItem.js

import React from 'react';
import './BuyerItem.css';

function BuyerItem({ listing }) {
  return (
    <div className="buyer-item">
      <img src={listing.imageUrl} alt={listing.address} className="buyer-image" />
      <div className="buyer-details">
        <h3 className="buyer-title">{listing.address}</h3>
        <p className="buyer-location">{listing.city}, {listing.state} {listing.zip}</p>
        <div className="buyer-action-buttons">
          <button className="buyer-button share">Share</button>
          <button className="buyer-button leave">Leave</button>
        </div>
      </div>
      <div className="buyer-agents">
        {listing.agents.map((agent, index) => (
          <img key={index} src={agent} alt="Agent" className="agent-image" />
        ))}
      </div>
    </div>
  );
}

export default BuyerItem;
