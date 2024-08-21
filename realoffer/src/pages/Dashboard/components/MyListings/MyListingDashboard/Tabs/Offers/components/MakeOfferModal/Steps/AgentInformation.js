import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import axios from 'axios';
import './AgentInformation.css';

const AgentInformation = ({ handleNextStep, handlePrevStep }) => {
  const { user } = useAuth();
  const [isAgent, setIsAgent] = useState(false);
  const [agentData, setAgentData] = useState({
    name: '',
    licenseNumber: '',
    email: '',
    phoneNumber: '',
    agentImageUrl: '',
    agentImageBackgroundColor: '',
  });
  const [brokerageData, setBrokerageData] = useState({
    name: '',
    licenseNumber: '',
    addressLine1: '',
    addressLine2: '',
  });

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
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`);
      const userData = response.data;
      setAgentData({
        name: `${userData.firstName} ${userData.lastName}`,
        licenseNumber: userData.agentLicenseNumber || '',
        email: userData.email,
        phoneNumber: userData.phone || '',
        agentImageUrl: userData.profilePhotoUrl,
      });
      setBrokerageData({
        name: userData.agencyName || '',
        licenseNumber: userData.brokerageLicenseNumber || '',
        addressLine1: userData.agencyAddressLine1 || '',
        addressLine2: userData.agencyAddressLine2 || '',
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [user._id]);

  useEffect(() => {
    if (isAgent) {
      fetchUserData();
    }
  }, [isAgent, fetchUserData]);

  const handleToggleChange = (e) => {
    const newIsAgent = e.target.value === 'agent';
    setIsAgent(newIsAgent);
    if (!newIsAgent) {
      setAgentData({
        name: '',
        licenseNumber: '',
        email: '',
        phoneNumber: '',
        agentImageUrl: '',
        agentImageBackgroundColor: getRandomColor(),
      });
      setBrokerageData({
        name: '',
        licenseNumber: '',
        addressLine1: '',
        addressLine2: '',
      });
    }
  };

  const formatPhoneNumber = (value) => {
    if (!value) return '';
    const cleaned = ('' + value).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return value;
  };

  const handlePhoneNumberChange = (e) => {
    const { value } = e.target;
    const rawValue = value.replace(/\D/g, '');
    setAgentData(prev => ({ ...prev, phoneNumber: rawValue }));
  };

  const handlePhoneNumberBlur = (e) => {
    const { value } = e.target;
    const formattedValue = formatPhoneNumber(value);
    setAgentData(prev => ({ ...prev, phoneNumber: formattedValue }));
  };

  const handleAgentChange = (e) => {
    const { name, value } = e.target;
    setAgentData(prev => ({ ...prev, [name]: value }));
  };

  const handleBrokerageChange = (e) => {
    const { name, value } = e.target;
    setBrokerageData(prev => ({ ...prev, [name]: value }));
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
          value={agentData.name}
          onChange={handleAgentChange}
        />
        <input
          type="text"
          name="licenseNumber"
          placeholder="License Number"
          className="agent-info-input"
          value={agentData.licenseNumber}
          onChange={handleAgentChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="agent-info-input"
          value={agentData.email}
          onChange={handleAgentChange}
        />
        <input
          type="text"
          name="phoneNumber"
          placeholder="Phone Number"
          className="agent-info-input"
          value={formatPhoneNumber(agentData.phoneNumber)}
          onChange={handlePhoneNumberChange}
          onBlur={handlePhoneNumberBlur}
        />
      </div>
      <div className="agent-info-form-group">
        <label className="agent-info-label">Brokerage Information</label>
        <input
          type="text"
          name="name"
          placeholder="Brokerage Name"
          className="agent-info-input"
          value={brokerageData.name}
          onChange={handleBrokerageChange}
        />
        <input
          type="text"
          name="licenseNumber"
          placeholder="Brokerage License Number"
          className="agent-info-input"
          value={brokerageData.licenseNumber}
          onChange={handleBrokerageChange}
        />
        <input
          type="text"
          name="addressLine1"
          placeholder="Address Line 1"
          className="agent-info-input"
          value={brokerageData.addressLine1}
          onChange={handleBrokerageChange}
        />
        <input
          type="text"
          name="addressLine2"
          placeholder="Address Line 2"
          className="agent-info-input"
          value={brokerageData.addressLine2}
          onChange={handleBrokerageChange}
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