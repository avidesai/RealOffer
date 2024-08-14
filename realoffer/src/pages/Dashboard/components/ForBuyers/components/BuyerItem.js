// BuyerItem.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './BuyerItem.css';

function BuyerItem({ listing }) {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const fetchAgents = async () => {
      const agentDetails = await Promise.all(
        listing.agentIds.map(async (id) => {
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${id}`);
          return response.data;
        })
      );
      setAgents(agentDetails);
    };

    fetchAgents();
  }, [listing.agentIds]);

  return (
    <div className="buyer-item">
      <img src={listing.imagesUrls[0]} alt={`${listing.homeCharacteristics.address} view`} className="buyer-image" />
      <div className="buyer-details">
        <h3 className="buyer-title">{listing.homeCharacteristics.address}</h3>
        <p className="buyer-location">{listing.homeCharacteristics.city}, {listing.homeCharacteristics.state} {listing.homeCharacteristics.zip}</p>
        <div className="buyer-action-buttons">
          <button className="buyer-button share">Share</button>
          <button className="buyer-button archive">Archive</button>
        </div>
      </div>
      <div className="buyer-agents">
        {agents.map(agent => (
          <img key={agent._id} src={agent.profilePhotoUrl} alt={agent.firstName} className="agent-image" />
        ))}
      </div>
    </div>
  );
}

export default BuyerItem;
