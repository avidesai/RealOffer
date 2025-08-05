// AgentInformation.js

import React, { useEffect, useCallback, useState } from 'react';
import InputMask from 'react-input-mask';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import axios from 'axios';
import './AgentInformation.css';

const AgentInformation = ({ formData, handleNestedChange, handleNextStep, handlePrevStep, errors = [] }) => {
  const { user, token } = useAuth(); // Get the token from AuthContext
  const { offerData, updateOfferData } = useOffer();
  const isAgent = offerData.isAgentInTransaction || false;

  const getRandomColor = useCallback(() => {
    const vibrantColors = [
      '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1',
      '#955251', '#B565A7', '#009B77', '#DD4124', '#45B8AC',
      '#EFC050', '#5B5EA6', '#FF5733', '#C70039', '#900C3F',
      '#581845', '#1F618D', '#28B463', '#D68910', '#AF7AC5',
      '#2E86C1', '#F39C12', '#D35400', '#7D3C98', '#148F77'
    ];
    return vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}` // Add the token to the request headers
        }
      });
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
  }, [user._id, handleNestedChange, token]);

  // Track previous agent state to detect changes
  const [prevIsAgent, setPrevIsAgent] = useState(isAgent);

  useEffect(() => {
    if (isAgent) {
      fetchUserData();
    } else if (prevIsAgent !== isAgent) {
      // Only clear fields when switching from "I am the agent" to "Enter agent/broker info"
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
    
    // Update previous state
    setPrevIsAgent(isAgent);
  }, [isAgent, fetchUserData, getRandomColor, handleNestedChange, prevIsAgent]);



  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Agent Information</h2>
        <p>Provide contact and brokerage info for the Buyer Agent.</p>
      </div>
      <div className="agent-info-toggle">
        <label className="agent-info-checkbox">
          <input
            type="checkbox"
            name="agentOption"
            checked={isAgent}
            onChange={() => updateOfferData({ isAgentInTransaction: !isAgent })}
          />
          I am the agent in this transaction
        </label>
        <label className="agent-info-checkbox">
          <input
            type="checkbox"
            name="agentOptionOther"
            checked={!isAgent}
            onChange={() => updateOfferData({ isAgentInTransaction: false })}
          />
          Enter agent / broker information
        </label>
      </div>
      <div className="agent-info-form-group">
        <label className="agent-info-label">Agent Information</label>
        <input
          type="text"
          name="name"
          placeholder="Agent Name"
          className={errors.some(err => err.toLowerCase().includes('agent name')) ? 'agent-info-input error' : 'agent-info-input'}
          value={formData.presentedBy.name || ''}
          onChange={(e) => handleNestedChange(e, 'presentedBy')}
        />
        {errors.some(err => err.toLowerCase().includes('agent name')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('agent name'))}
          </div>
        )}
        <input
          type="text"
          name="licenseNumber"
          placeholder="License Number"
          className={errors.some(err => err.toLowerCase().includes('agent license number')) ? 'agent-info-input error' : 'agent-info-input'}
          value={formData.presentedBy.licenseNumber || ''}
          onChange={(e) => handleNestedChange(e, 'presentedBy')}
        />
        {errors.some(err => err.toLowerCase().includes('agent license number')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('agent license number'))}
          </div>
        )}
        <input
          type="email"
          name="email"
          placeholder="Email"
          className={errors.some(err => err.toLowerCase().includes('agent email')) ? 'agent-info-input error' : 'agent-info-input'}
          value={formData.presentedBy.email || ''}
          onChange={(e) => handleNestedChange(e, 'presentedBy')}
        />
        {errors.some(err => err.toLowerCase().includes('agent email')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('agent email'))}
          </div>
        )}
        <InputMask
          mask="(999) 999-9999"
          value={formData.presentedBy.phoneNumber || ''}
          onChange={(e) => handleNestedChange(e, 'presentedBy')}
        >
          {(inputProps) => (
            <input
              {...inputProps}
              type="text"
              name="phoneNumber"
              placeholder="Phone Number"
              className={errors.some(err => err.toLowerCase().includes('agent phone number')) ? 'agent-info-input error' : 'agent-info-input'}
            />
          )}
        </InputMask>
        {errors.some(err => err.toLowerCase().includes('agent phone number')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('agent phone number'))}
          </div>
        )}
      </div>
      <div className="agent-info-form-group">
        <label className="agent-info-label">Brokerage Information</label>
        <input
          type="text"
          name="name"
          placeholder="Brokerage Name"
          className={errors.some(err => err.toLowerCase().includes('brokerage name')) ? 'agent-info-input error' : 'agent-info-input'}
          value={formData.brokerageInfo.name || ''}
          onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
        />
        {errors.some(err => err.toLowerCase().includes('brokerage name')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('brokerage name'))}
          </div>
        )}
        <input
          type="text"
          name="licenseNumber"
          placeholder="Brokerage License Number"
          className="agent-info-input"
          value={formData.brokerageInfo.licenseNumber || ''}
          onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
        />
        <input
          type="text"
          name="addressLine1"
          placeholder="Address Line 1"
          className="agent-info-input"
          value={formData.brokerageInfo.addressLine1 || ''}
          onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
        />
        <input
          type="text"
          name="addressLine2"
          placeholder="Address Line 2"
          className="agent-info-input"
          value={formData.brokerageInfo.addressLine2 || ''}
          onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
        />
      </div>
      <div className="mom-button-container">
        <button className="mom-step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button className="mom-next-button" onClick={handleNextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default AgentInformation;
