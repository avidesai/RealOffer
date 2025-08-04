// MoreInfo.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../../../../../../context/api';
import Modal from 'react-modal';
import InputMask from 'react-input-mask';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './MoreInfo.css';

Modal.setAppElement('#root'); // Set the root element for accessibility

const MoreInfo = ({ isOpen, onClose, listingId }) => {
  const { user, token } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [agents, setAgents] = useState([]);
  const debounceTimer = useRef({});
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  const fetchAgents = useCallback(async (agentIds) => {
    if (!agentIds || agentIds.length === 0) {
      setAgents([]);
      setSelectedAgents([]);
      return;
    }

    try {
      const agentPromises = agentIds.map(id => 
        api.get(`/api/users/${id}`)
      );
      const agentResponses = await Promise.all(agentPromises);
      const fetchedAgents = agentResponses.map(response => response.data);
      
      setAgents(fetchedAgents);
      setSelectedAgents(fetchedAgents.filter(agent => agent._id !== user._id));
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, [user._id]);

  const fetchListing = useCallback(async () => {
    if (!listingId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/propertyListings/${listingId}`);
      
      // Ensure escrow data structure exists
      const listingData = response.data;
      if (!listingData.escrowInfo) {
        listingData.escrowInfo = { 
          escrowNumber: '', 
          company: { name: '', phone: '', email: '' } 
        };
      } else if (!listingData.escrowInfo.company) {
        listingData.escrowInfo.company = { name: '', phone: '', email: '' };
      }
      
      setListing(listingData);
      setHasChanges(false);
      
      // Fetch agents for this listing
      await fetchAgents(listingData.agentIds);
    } catch (error) {
      console.error('Error fetching listing:', error);
      setError('Failed to load property information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [listingId, fetchAgents]);

  useEffect(() => {
    if (isOpen) {
      fetchListing();
    }
  }, [isOpen, fetchListing]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search for agents
  const searchAgents = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(`/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Filter out current user and already selected agents
      const filteredResults = response.data.filter(agent => 
        agent._id !== user._id && 
        !agents.some(existing => existing._id === agent._id) &&
        !selectedAgents.some(selected => selected._id === agent._id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching agents:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowDropdown(true);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAgents(query);
    }, 300);
  };

  // Add agent to selected list
  const addAgent = async (agent) => {
    const newSelectedAgents = [...selectedAgents, agent];
    setSelectedAgents(newSelectedAgents);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
    
    // Update the listing with the new agent
    const allAgentIds = [user._id, ...newSelectedAgents.map(a => a._id)];
    try {
      await api.put(`/api/propertyListings/${listingId}`, {
        agentIds: allAgentIds
      });
      setHasChanges(true);
    } catch (error) {
      console.error('Error adding agent:', error);
      setError('Failed to add agent. Please try again.');
    }
  };

  // Remove agent from selected list
  const removeAgent = async (agentId) => {
    const newSelectedAgents = selectedAgents.filter(agent => agent._id !== agentId);
    setSelectedAgents(newSelectedAgents);
    
    // Update the listing without the removed agent
    const allAgentIds = [user._id, ...newSelectedAgents.map(a => a._id)];
    try {
      await api.put(`/api/propertyListings/${listingId}`, {
        agentIds: allAgentIds
      });
      setHasChanges(true);
    } catch (error) {
      console.error('Error removing agent:', error);
      setError('Failed to remove agent. Please try again.');
    }
  };

  const handleInputChange = (e, field) => {
    const { value } = e.target;
    
    // For datetime-local inputs, convert to proper datetime format
    let processedValue = value;
    if (field === 'offerDueDate' && value) {
      // Convert datetime-local value to ISO string for backend
      const date = new Date(value);
      processedValue = date.toISOString();
      
      // Also update the timezone when offer due date is changed
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setListing(prevState => ({
        ...prevState,
        offerDueDateTimezone: timezone
      }));
    }
    
    // Update local state immediately
    const [mainField, subField, nestedField] = field.split('.');
    if (nestedField) {
      setListing(prevState => ({
        ...prevState,
        [mainField]: {
          ...prevState[mainField],
          [subField]: {
            ...prevState[mainField][subField],
            [nestedField]: processedValue
          }
        }
      }));
    } else if (subField) {
      setListing(prevState => ({
        ...prevState,
        [mainField]: {
          ...prevState[mainField],
          [subField]: processedValue
        }
      }));
    } else {
      setListing(prevState => ({
        ...prevState,
        [field]: processedValue
      }));
    }

    // Mark that changes have been made
    setHasChanges(true);

    // Clear existing timer for this field
    if (debounceTimer.current[field]) {
      clearTimeout(debounceTimer.current[field]);
    }

    // Debounce the API call
    debounceTimer.current[field] = setTimeout(async () => {
      let updatedField = {};

      if (nestedField) {
        updatedField = {
          [mainField]: {
            ...listing[mainField],
            [subField]: {
              ...listing[mainField][subField],
              [nestedField]: processedValue
            }
          }
        };
      } else if (subField) {
        updatedField = {
          [mainField]: {
            ...listing[mainField],
            [subField]: processedValue
          }
        };
      } else {
        updatedField = { [field]: processedValue };
      }

      // Include timezone when updating offer due date
      if (field === 'offerDueDate') {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        updatedField.offerDueDateTimezone = timezone;
      }

      try {
        await api.put(`/api/propertyListings/${listingId}`, updatedField);
      } catch (error) {
        console.error('Error updating listing:', error);
        setError('Failed to update property information. Please try again.');
      }
    }, 1000);
  };

  const handleClose = () => {
    onClose(hasChanges);
  };

  // Formatting helpers
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };
  const formatPropertyType = (type) => {
    const types = {
      singleFamily: "Single Family Home",
      condo: "Condominium",
      townhouse: "Townhouse",
      multiFamily: "Multi-Family Home",
      land: "Land",
      commercial: "Commercial"
    };
    return types[type] || type || '';
  };
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format for datetime-local input: YYYY-MM-DDTHH:MM
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Formatting functions for display (similar to CreateListingPackage)
  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDisplayNumber = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const handleFormattedChange = (e, field) => {
    const { value } = e.target;
    const rawValue = value.replace(/[^0-9]/g, '');
    handleInputChange({
      target: {
        name: field,
        value: rawValue
      }
    }, field);
  };

  const renderField = (label, field, value, formatter) => {
    const isNumber = ['homeCharacteristics.price','homeCharacteristics.beds','homeCharacteristics.baths','homeCharacteristics.squareFootage','homeCharacteristics.lotSize','homeCharacteristics.yearBuilt'].includes(field);
    const isPhone = field === 'escrowInfo.company.phone';
    const isDate = field === 'offerDueDate';
    const isPrice = field === 'homeCharacteristics.price';
    const isFormattedNumber = field === 'homeCharacteristics.squareFootage' || field === 'homeCharacteristics.lotSize';
    
    // Define realistic increments for different fields
    const getFieldConfig = (fieldName) => {
      switch (fieldName) {
        case 'homeCharacteristics.price':
          return { step: 1000, min: 0, max: 10000000 };
        case 'homeCharacteristics.beds':
          return { step: 1, min: 0, max: 20 };
        case 'homeCharacteristics.baths':
          return { step: 0.5, min: 0, max: 20 };
        case 'homeCharacteristics.squareFootage':
          return { step: 100, min: 0, max: 50000 };
        case 'homeCharacteristics.lotSize':
          return { step: 1000, min: 0, max: 1000000 };
        case 'homeCharacteristics.yearBuilt':
          return { step: 1, min: 1800, max: new Date().getFullYear() + 1 };
        default:
          return { step: 1, min: 0, max: 999999 };
      }
    };
    
    const fieldConfig = getFieldConfig(field);
    
    return (
              <div className="mlmi-info-row" key={field}>
          <span className="mlmi-info-label">{label}</span>
          <div className="mlmi-field-container">
          {field === 'homeCharacteristics.propertyType' ? (
            <select
              name="propertyType"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
              className="form-control"
            >
              <option value="">Select Property Type</option>
              <option value="singleFamily">Single Family Home</option>
              <option value="condo">Condominium</option>
              <option value="townhouse">Townhouse</option>
              <option value="multiFamily">Multi-Family Home</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
            </select>
          ) : field === 'scheduleShowingUrl' ? (
            <input
              type="url"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
              className="mlmi-form-control"
              placeholder="https://example.com/schedule-showing"
            />
          ) : isDate ? (
            <input
              type="datetime-local"
              value={formatDateForInput(value)}
              onChange={(e) => handleInputChange(e, field)}
              className="mlmi-form-control"
            />
          ) : isPrice ? (
            <input
              type="text"
              value={formatCurrency(value)}
              onChange={(e) => handleFormattedChange(e, field)}
              className="mlmi-form-control"
            />
          ) : isFormattedNumber ? (
            <input
              type="text"
              value={formatDisplayNumber(value)}
              onChange={(e) => handleFormattedChange(e, field)}
              className="mlmi-form-control"
            />
          ) : isNumber ? (
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
              className="mlmi-form-control"
              min={fieldConfig.min}
              max={fieldConfig.max}
              step={fieldConfig.step}
            />
          ) : isPhone ? (
            <InputMask
              mask="(999) 999-9999"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
            >
              {(inputProps) => (
                <input
                  {...inputProps}
                  type="text"
                  className="mlmi-form-control"
                />
              )}
            </InputMask>
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
              className="mlmi-form-control"
            />
          )}
        </div>
      </div>
    );
  };

  if (!listing && !loading && !error) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onRequestClose={handleClose} 
      className="mlmi-more-info-modal" 
      overlayClassName="mlmi-more-info-overlay"
      closeTimeoutMS={300}
    >
      <div className="mlmi-more-info-content">
        <div className="mlmi-more-info-header">
          <h2>Property Information</h2>
          <button className="mlmi-more-info-close-button" onClick={handleClose}></button>
        </div>
        
        {error && (
          <div className="mlmi-more-info-error">{error}</div>
        )}
        
        {loading && !listing ? (
          <div className="mlmi-loading-spinner"></div>
        ) : listing ? (
          <>
            <div className="mlmi-info-section">
              <h3>Property Details</h3>
              <div className="mlmi-info-grid">
                {renderField('Price', 'homeCharacteristics.price', listing.homeCharacteristics.price, formatCurrency)}
                {renderField('Property Type', 'homeCharacteristics.propertyType', listing.homeCharacteristics.propertyType, formatPropertyType)}
                {renderField('Beds', 'homeCharacteristics.beds', listing.homeCharacteristics.beds)}
                {renderField('Baths', 'homeCharacteristics.baths', listing.homeCharacteristics.baths)}
                {renderField('Square Footage', 'homeCharacteristics.squareFootage', listing.homeCharacteristics.squareFootage, formatDisplayNumber)}
                {renderField('Lot Size', 'homeCharacteristics.lotSize', listing.homeCharacteristics.lotSize, formatDisplayNumber)}
                {renderField('Year Built', 'homeCharacteristics.yearBuilt', listing.homeCharacteristics.yearBuilt)}
                {renderField('Offer Due Date', 'offerDueDate', listing.offerDueDate, formatDate)}
              </div>
            </div>
            
            <div className="mlmi-info-section">
              <h3>Location</h3>
              {renderField('Address', 'homeCharacteristics.address', listing.homeCharacteristics.address)}
              {renderField('City', 'homeCharacteristics.city', listing.homeCharacteristics.city)}
              {renderField('State', 'homeCharacteristics.state', listing.homeCharacteristics.state)}
              {renderField('Zip Code', 'homeCharacteristics.zip', listing.homeCharacteristics.zip)}
            </div>
            
            <div className="mlmi-info-section">
              <h3>Listing Agents</h3>
              
              {/* Additional Agents Search - Only show if less than 2 total agents */}
              {selectedAgents.length < 1 && (
                <div className="mlmi-agent-section">
                  <label className="mlmi-info-label">Add Additional Agents</label>
                  <div className="mlmi-agent-search-container" ref={dropdownRef}>
                    <input
                      type="text"
                      placeholder="Search for agents by name or email..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => setShowDropdown(true)}
                      className="mlmi-agent-search-input"
                    />
                    
                    {showDropdown && (searchQuery.length > 0 || searchLoading) && (
                      <div className="mlmi-agent-dropdown">
                        {searchLoading ? (
                          <div className="mlmi-dropdown-loading">Searching...</div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map(agent => (
                            <div
                              key={agent._id}
                              className="mlmi-dropdown-item"
                              onClick={() => addAgent(agent)}
                            >
                              <div className="mlmi-agent-info">
                                <span className="mlmi-agent-name">{`${agent.firstName} ${agent.lastName}`}</span>
                                <span className="mlmi-agent-email">{agent.email}</span>
                                {agent.agencyName && (
                                  <span className="mlmi-agent-agency">{agent.agencyName}</span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : searchQuery.length >= 2 ? (
                          <div className="mlmi-dropdown-no-results">No agents found</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Agents List */}
              <div className="mlmi-selected-agents-list">
                {/* Primary Agent (Current User) - Always First */}
                <div className="mlmi-selected-agent-item">
                  <div className="mlmi-agent-info">
                    <span className="mlmi-agent-name">{`${user?.firstName} ${user?.lastName}`}</span>
                    {user?.phone && (
                      <span className="mlmi-agent-phone">{user.phone}</span>
                    )}
                    <span className="mlmi-agent-email">{user?.email}</span>
                    {user?.agencyName && (
                      <span className="mlmi-agent-agency">{user.agencyName}</span>
                    )}
                  </div>
                  <span className="mlmi-primary-badge">Primary</span>
                </div>
                
                {/* Additional Agents */}
                {selectedAgents.map(agent => (
                  <div key={agent._id} className="mlmi-selected-agent-item">
                    <div className="mlmi-agent-info">
                      <span className="mlmi-agent-name">{`${agent.firstName} ${agent.lastName}`}</span>
                      {agent.phone && (
                        <span className="mlmi-agent-phone">{agent.phone}</span>
                      )}
                      <span className="mlmi-agent-email">{agent.email}</span>
                      {agent.agencyName && (
                        <span className="mlmi-agent-agency">{agent.agencyName}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="mlmi-remove-agent-btn"
                      onClick={() => removeAgent(agent._id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mlmi-info-section">
              <h3>Escrow Information</h3>
              {renderField('Escrow Number', 'escrowInfo.escrowNumber', listing.escrowInfo.escrowNumber)}
              {renderField('Company Name', 'escrowInfo.company.name', listing.escrowInfo.company.name)}
              {renderField('Phone', 'escrowInfo.company.phone', listing.escrowInfo.company.phone, formatPhone)}
              {renderField('Email', 'escrowInfo.company.email', listing.escrowInfo.company.email)}
            </div>
            
            <div className="mlmi-info-section">
              <h3>Showing Information</h3>
              {renderField('Schedule Showings Link', 'scheduleShowingUrl', listing.scheduleShowingUrl)}
            </div>
            
            <div className="mlmi-info-section mlmi-property-description-container">
              <h3 className="mlmi-property-description-title">Property Description</h3>
              <div className="mlmi-description-edit-container">
                <textarea
                  value={listing.description || ''}
                  onChange={(e) => handleInputChange(e, 'description')}
                  className="mlmi-form-control"
                  placeholder="Enter a detailed description of the property, including features, amenities, and highlights..."
                  rows={14}
                  style={{resize:'vertical',minHeight:180,maxHeight:500}}
                />
              </div>
            </div>
          </>
        ) : null}
        
        {loading && listing && <div className="mlmi-loading-spinner"></div>}
      </div>
    </Modal>
  );
};

export default MoreInfo;
