import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './BuyerItem.css';

function BuyerItem({ buyerPackage }) {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const fetchAgents = async () => {
      const agentDetails = await Promise.all(
        buyerPackage.agentIds.map(async (id) => {
          const response = await axios.get(`http://localhost:8000/api/users/${id}`);
          return response.data;
        })
      );
      setAgents(agentDetails);
    };

    fetchAgents();
  }, [buyerPackage.agentIds]);

  return (
    <div className="buyer-item">
      <img src={buyerPackage.imagesUrls[0]} alt={`${buyerPackage.homeCharacteristics.address} view`} className="buyer-image" />
      <div className="buyer-details">
        <h3 className="buyer-title">{buyerPackage.homeCharacteristics.address}</h3>
        <p className="buyer-location">{buyerPackage.homeCharacteristics.city}, {buyerPackage.homeCharacteristics.state} {buyerPackage.homeCharacteristics.zip}</p>
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
