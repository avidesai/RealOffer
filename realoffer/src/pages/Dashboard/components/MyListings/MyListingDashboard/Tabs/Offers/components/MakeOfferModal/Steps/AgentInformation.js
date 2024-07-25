import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import axios from 'axios';
import './AgentInformation.css';

const AgentInformation = ({ formData, handleNestedChange, handleNextStep, handlePrevStep }) => {
  const { user } = useAuth();
  const [isAgent, setIsAgent] = useState(false);
  const vibrantColors = [
    '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1', 
    '#955251', '#B565A7', '#009B77', '#DD4124', '#45B8AC', 
    '#EFC050', '#5B5EA6'
  ];
  
  const getRandomColor = useCallback(() => {
    return vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
  }, [vibrantColors]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (isAgent) {
        try {
          const response = await axios.get(`http://localhost:8000/api/users/${user._id}`);
          const userData = response.data;
          handleNestedChange({ target: { name: 'name', value: `${userData.firstName} ${userData.lastName}` } }, 'presentedBy');
          handleNestedChange({ target: { name: 'licenseNumber', value: userData.agentLicenseNumber || '' } }, 'presentedBy');
          handleNestedChange({ target: { name: 'email', value: userData.email } }, 'presentedBy');
          handleNestedChange({ target: { name: 'phoneNumber', value: userData.phone || '' } }, 'presentedBy');
          handleNestedChange({ target: { name: 'agentImageUrl', value: userData.profilePhotoUrl } }, 'presentedBy');
          handleNestedChange({ target: { name: 'name', value: userData.agencyName || '' } }, 'brokerageInfo');
          handleNestedChange({ target: { name: 'licenseNumber', value: userData.brokerageLicenseNumber || '' } }, 'brokerageInfo');
          handleNestedChange({ target: { name: 'addressLine1', value: userData.agencyAddressLine1 || '' } }, 'brokerageInfo');
          handleNestedChange({ target: { name: 'addressLine2', value: userData.agencyAddressLine2 || '' } }, 'brokerageInfo');
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        handleNestedChange({ target: { name: 'name', value: '' } }, 'presentedBy');
        handleNestedChange({ target: { name: 'licenseNumber', value: '' } }, 'presentedBy');
        handleNestedChange({ target: { name: 'email', value: '' } }, 'presentedBy');
        handleNestedChange({ target: { name: 'phoneNumber', value: '' } }, 'presentedBy');
        handleNestedChange({ target: { name: 'agentImageUrl', value: '' } }, 'presentedBy');
        handleNestedChange({ target: { name: 'agentImageBackgroundColor', value: getRandomColor() } }, 'presentedBy');
        handleNestedChange({ target: { name: 'name', value: '' } }, 'brokerageInfo');
        handleNestedChange({ target: { name: 'licenseNumber', value: '' } }, 'brokerageInfo');
        handleNestedChange({ target: { name: 'addressLine1', value: '' } }, 'brokerageInfo');
        handleNestedChange({ target: { name: 'addressLine2', value: '' } }, 'brokerageInfo');
      }
    };

    fetchUserData();
  }, [isAgent, user._id, getRandomColor, handleNestedChange]);

  const handleToggleChange = (e) => {
    setIsAgent(e.target.value === 'agent');
  };

  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Agent Information</h2>
        <p>Provide contact and brokerage info for the Buyer Agent.</p>
      </div>
      <div className="agent-info-toggle">
        <label className="agent-info-radio">
          <input
            type="radio"
            name="agentOption"
            value="enter"
            checked={!isAgent}
            onChange={handleToggleChange}
          />
          Enter agent / broker information
        </label>
        <label className="agent-info-radio">
          <input
            type="radio"
            name="agentOption"
            value="agent"
            checked={isAgent}
            onChange={handleToggleChange}
          />
          I am the agent in this transaction
        </label>
      </div>
      <div className="agent-info-form-group">
        <label className="agent-info-label">Agent Information</label>
        <input
          type="text"
          name="name"
          placeholder="Agent Name"
          className="agent-info-input"
          value={formData.presentedBy.name}
          onChange={(e) => handleNestedChange(e, 'presentedBy')}
        />
        <input
          type="text"
          name="licenseNumber"
          placeholder="License Number"
          className="agent-info-input"
          value={formData.presentedBy.licenseNumber}
          onChange={(e) => handleNestedChange(e, 'presentedBy')}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="agent-info-input"
          value={formData.presentedBy.email}
          onChange={(e) => handleNestedChange(e, 'presentedBy')}
        />
        <input
          type="text"
          name="phoneNumber"
          placeholder="Phone Number"
          className="agent-info-input"
          value={formData.presentedBy.phoneNumber}
          onChange={(e) => handleNestedChange(e, 'presentedBy')}
        />
      </div>
      <div className="agent-info-form-group">
        <label className="agent-info-label">Brokerage Information</label>
        <input
          type="text"
          name="name"
          placeholder="Brokerage Name"
          className="agent-info-input"
          value={formData.brokerageInfo.name}
          onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
        />
        <input
          type="text"
          name="licenseNumber"
          placeholder="Brokerage License Number"
          className="agent-info-input"
          value={formData.brokerageInfo.licenseNumber}
          onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
        />
        <input
          type="text"
          name="addressLine1"
          placeholder="Address Line 1"
          className="agent-info-input"
          value={formData.brokerageInfo.addressLine1}
          onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
        />
        <input
          type="text"
          name="addressLine2"
          placeholder="Address Line 2"
          className="agent-info-input"
          value={formData.brokerageInfo.addressLine2}
          onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
        />
      </div>
      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button className="next-button" onClick={handleNextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default AgentInformation;
