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
  const [agents, setAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('');
  const [teamMemberSearchResults, setTeamMemberSearchResults] = useState([]);
  const [teamMemberSearchLoading, setTeamMemberSearchLoading] = useState(false);
  const [showTeamMemberDropdown, setShowTeamMemberDropdown] = useState(false);
  const [invitingTeamMember, setInvitingTeamMember] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const teamMemberSearchTimeoutRef = useRef(null);
  const teamMemberDropdownRef = useRef(null);
  const debounceTimer = useRef({});

  const fetchAgents = useCallback(async (agentIds) => {
    if (!agentIds || agentIds.length === 0) {
      setAgents([]);
      setSelectedAgents([]);
      return;
    }

    try {
      // Check if agentIds are already populated objects or just IDs
      const isPopulated = agentIds.length > 0 && typeof agentIds[0] === 'object' && agentIds[0]._id;
      
      let fetchedAgents;
      if (isPopulated) {
        // agentIds are already populated user objects
        fetchedAgents = agentIds;
      } else {
        // agentIds are just IDs, need to fetch user objects
        const agentPromises = agentIds.map(id => 
          api.get(`/api/users/${id}`)
        );
        const agentResponses = await Promise.all(agentPromises);
        fetchedAgents = agentResponses.map(response => response.data);
      }
      
      setAgents(fetchedAgents);
      // Filter out current user from selected agents - they will be handled separately based on their role
      setSelectedAgents(fetchedAgents.filter(agent => agent._id !== user._id));
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, [user._id]);

  const fetchTeamMembers = useCallback(async (teamMemberIds) => {
    if (!teamMemberIds || teamMemberIds.length === 0) {
      setTeamMembers([]);
      setSelectedTeamMembers([]);
      return;
    }

    try {
      // Check if teamMemberIds are already populated objects or just IDs
      const isPopulated = teamMemberIds.length > 0 && typeof teamMemberIds[0] === 'object' && teamMemberIds[0]._id;
      
      let fetchedTeamMembers;
      if (isPopulated) {
        // teamMemberIds are already populated user objects
        fetchedTeamMembers = teamMemberIds;
      } else {
        // teamMemberIds are just IDs, need to fetch user objects
        const teamMemberPromises = teamMemberIds.map(id => 
          api.get(`/api/users/${id}`)
        );
        const teamMemberResponses = await Promise.all(teamMemberPromises);
        fetchedTeamMembers = teamMemberResponses.map(response => response.data);
      }
      
      setTeamMembers(fetchedTeamMembers);
      // Filter out current user from selected team members - they will be handled separately based on their role
      setSelectedTeamMembers(fetchedTeamMembers.filter(teamMember => teamMember._id !== user._id));
    } catch (error) {
      console.error('Error fetching team members:', error);
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
      
      // Fetch agents and team members for this listing
      await fetchAgents(listingData.agentIds);
      await fetchTeamMembers(listingData.teamMemberIds);
    } catch (error) {
      console.error('Error fetching listing:', error);
      setError('Failed to load property information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [listingId, fetchAgents, fetchTeamMembers]);

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
      if (teamMemberDropdownRef.current && !teamMemberDropdownRef.current.contains(event.target)) {
        setShowTeamMemberDropdown(false);
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
        !selectedAgents.some(selected => selected._id === agent._id) &&
        !teamMembers.some(teamMember => teamMember._id === agent._id) &&
        !selectedTeamMembers.some(selected => selected._id === agent._id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching agents:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Search for team members
  const searchTeamMembers = async (query) => {
    if (!query || query.trim().length < 2) {
      setTeamMemberSearchResults([]);
      return;
    }

    setTeamMemberSearchLoading(true);
    try {
      const response = await api.get(`/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Filter out current user and already selected team members
      const filteredResults = response.data.filter(teamMember => 
        teamMember._id !== user._id && 
        !teamMembers.some(existing => existing._id === teamMember._id) &&
        !selectedTeamMembers.some(selected => selected._id === teamMember._id) &&
        !agents.some(agent => agent._id === teamMember._id) &&
        !selectedAgents.some(selected => selected._id === teamMember._id)
      );
      
      setTeamMemberSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching team members:', error);
      setTeamMemberSearchResults([]);
    } finally {
      setTeamMemberSearchLoading(false);
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

  // Handle team member search input change
  const handleTeamMemberSearchChange = (e) => {
    const query = e.target.value;
    setTeamMemberSearchQuery(query);
    setShowTeamMemberDropdown(true);

    // Debounce search
    if (teamMemberSearchTimeoutRef.current) {
      clearTimeout(teamMemberSearchTimeoutRef.current);
    }

    teamMemberSearchTimeoutRef.current = setTimeout(() => {
      searchTeamMembers(query);
    }, 300);
  };

  // Add agent to selected list
  const addAgent = async (agent) => {
    if (selectedAgents.length >= 1) {
      setError('Maximum of 1 additional agent allowed.');
      return;
    }

    try {
      const allAgentIds = [user._id, ...selectedAgents.map(a => a._id), agent._id];
      
      await api.put(`/api/propertyListings/${listingId}`, {
        agentIds: allAgentIds
      });

      setSelectedAgents([...selectedAgents, agent]);
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      setHasChanges(true);
      setError(null);
    } catch (error) {
      console.error('Error adding agent:', error);
      setError('Failed to add agent. Please try again.');
    }
  };

  // Add team member to selected list
  const addTeamMember = async (teamMember) => {
    if (teamMember.isInvite) {
      // For invite options, add to selected and show form fields
      setSelectedTeamMembers([...selectedTeamMembers, teamMember]);
      setTeamMemberSearchQuery('');
      setTeamMemberSearchResults([]);
      setShowTeamMemberDropdown(false);
    } else {
      // For existing users, add directly
      try {
        const allTeamMemberIds = [...selectedTeamMembers.map(tm => tm._id), teamMember._id];
        
        await api.put(`/api/propertyListings/${listingId}`, {
          teamMemberIds: allTeamMemberIds
        });

        setSelectedTeamMembers([...selectedTeamMembers, teamMember]);
        setTeamMemberSearchQuery('');
        setTeamMemberSearchResults([]);
        setShowTeamMemberDropdown(false);
        setHasChanges(true);
        setError(null);
      } catch (error) {
        console.error('Error adding team member:', error);
        setError('Failed to add team member. Please try again.');
      }
    }
  };

  // Invite team member who doesn't have an account
  const inviteTeamMember = async (inviteData, firstName, lastName) => {
    setInvitingTeamMember(true);
    setInviteError('');
    
    try {
      const response = await api.post('/api/users/invite-team-member', {
        email: inviteData.inviteEmail,
        firstName: firstName,
        lastName: lastName,
        listingId: listingId,
        propertyAddress: listing.homeCharacteristics.address,
        inviterName: `${user.firstName} ${user.lastName}`,
        message: ''
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Invitation response:', response.data);
      setInviteSuccess(true);
      setTeamMemberSearchQuery('');
      setTeamMemberSearchResults([]);
      setShowTeamMemberDropdown(false);
      
      // Remove the invite from selected team members
      setSelectedTeamMembers(prev => prev.filter(tm => tm._id !== inviteData._id));
      
      // Show success message for a few seconds
      setTimeout(() => {
        setInviteSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error inviting team member:', error);
      setInviteError(error.response?.data?.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInvitingTeamMember(false);
    }
  };

  // Remove agent from selected list
  const removeAgent = async (agentId) => {
    try {
      const newSelectedAgents = selectedAgents.filter(agent => agent._id !== agentId);
      const allAgentIds = [user._id, ...newSelectedAgents.map(a => a._id)];
      
      await api.put(`/api/propertyListings/${listingId}`, {
        agentIds: allAgentIds
      });

      setSelectedAgents(newSelectedAgents);
      setHasChanges(true);
      setError(null);
    } catch (error) {
      console.error('Error removing agent:', error);
      setError('Failed to remove agent. Please try again.');
    }
  };

  // Remove team member from selected list
  const removeTeamMember = async (teamMemberId) => {
    try {
      const newSelectedTeamMembers = selectedTeamMembers.filter(teamMember => teamMember._id !== teamMemberId);
      const allTeamMemberIds = newSelectedTeamMembers.map(tm => tm._id);
      
      await api.put(`/api/propertyListings/${listingId}`, {
        teamMemberIds: allTeamMemberIds
      });

      setSelectedTeamMembers(newSelectedTeamMembers);
      setHasChanges(true);
      setError(null);
    } catch (error) {
      console.error('Error removing team member:', error);
      setError('Failed to remove team member. Please try again.');
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

  // Helper functions to determine user's role
  const isUserPrimaryAgent = () => {
    if (!listing || !listing.agentIds || listing.agentIds.length === 0) return false;
    // The first agent in the list is the primary agent (listing creator)
    const primaryAgentId = Array.isArray(listing.agentIds) && listing.agentIds.length > 0 
      ? (typeof listing.agentIds[0] === 'object' ? listing.agentIds[0]._id : listing.agentIds[0])
      : null;
    return primaryAgentId === user._id;
  };

  const isUserAdditionalAgent = () => {
    if (!listing || !listing.agentIds) return false;
    const agentIds = listing.agentIds.filter(id => {
      const agentId = typeof id === 'object' ? id._id : id;
      return agentId !== user._id;
    });
    // Check if current user is in the agentIds but not the primary agent
    return agentIds.some(id => {
      const agentId = typeof id === 'object' ? id._id : id;
      return agentId === user._id;
    });
  };

  const isUserTeamMember = () => {
    if (!listing || !listing.teamMemberIds) return false;
    return listing.teamMemberIds.some(id => {
      const teamMemberId = typeof id === 'object' ? id._id : id;
      return teamMemberId === user._id;
    });
  };

  const getPrimaryAgent = () => {
    if (!listing || !listing.agentIds || listing.agentIds.length === 0) return null;
    const primaryAgentId = typeof listing.agentIds[0] === 'object' ? listing.agentIds[0]._id : listing.agentIds[0];
    return agents.find(agent => agent._id === primaryAgentId);
  };

  const getAdditionalAgents = () => {
    if (!listing || !listing.agentIds) return [];
    const primaryAgentId = typeof listing.agentIds[0] === 'object' ? listing.agentIds[0]._id : listing.agentIds[0];
    return agents.filter(agent => agent._id !== primaryAgentId);
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
              
              {/* Additional Agents Search - Only show if current user is primary agent or additional agent, and less than 2 total agents */}
              {(isUserPrimaryAgent() || isUserAdditionalAgent()) && selectedAgents.length < 1 && (
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
                {/* Primary Agent */}
                {getPrimaryAgent() && (
                  <div className="mlmi-selected-agent-item">
                    <div className="mlmi-agent-info">
                      <span className="mlmi-agent-name">{`${getPrimaryAgent().firstName} ${getPrimaryAgent().lastName}`}</span>
                      {getPrimaryAgent().phone && (
                        <span className="mlmi-agent-phone">{getPrimaryAgent().phone}</span>
                      )}
                      <span className="mlmi-agent-email">{getPrimaryAgent().email}</span>
                      {getPrimaryAgent().agencyName && (
                        <span className="mlmi-agent-agency">{getPrimaryAgent().agencyName}</span>
                      )}
                    </div>
                    <span className="mlmi-primary-badge">Primary</span>
                  </div>
                )}
                
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
                    {(isUserPrimaryAgent() || isUserAdditionalAgent()) && (
                      <button
                        type="button"
                        className="mlmi-remove-agent-btn"
                        onClick={() => removeAgent(agent._id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mlmi-info-section mlmi-team-members-section">
              <h3>Team Members</h3>
              <p className="mlmi-team-members-description">
                Team members have access to manage this listing. Team members will not be displayed to buyers or other external parties.
              </p>
              
              {/* Team Members Search - Only show if current user is primary agent or additional agent */}
              {(isUserPrimaryAgent() || isUserAdditionalAgent()) && (
                <div className="mlmi-agent-section">
                <label className="mlmi-info-label">Add Team Members</label>
                <div className="mlmi-agent-search-container" ref={teamMemberDropdownRef}>
                  <input
                    type="text"
                    placeholder="Search for team members by name or email..."
                    value={teamMemberSearchQuery}
                    onChange={handleTeamMemberSearchChange}
                    onFocus={() => setShowTeamMemberDropdown(true)}
                    className="mlmi-agent-search-input"
                  />
                  
                  {showTeamMemberDropdown && (teamMemberSearchQuery.length > 0 || teamMemberSearchLoading) && (
                    <div className="mlmi-agent-dropdown">
                      {teamMemberSearchLoading ? (
                        <div className="mlmi-dropdown-loading">Searching...</div>
                      ) : teamMemberSearchResults.length > 0 ? (
                        teamMemberSearchResults.map(teamMember => (
                          <div
                            key={teamMember._id}
                            className={`mlmi-dropdown-item ${teamMember.isInvite ? 'mlmi-invite-item' : ''}`}
                            onClick={() => addTeamMember(teamMember)}
                          >
                            <div className="mlmi-agent-info">
                              <span className="mlmi-agent-name">
                                {teamMember.isInvite ? `Invite ${teamMember.firstName} ${teamMember.lastName}` : `${teamMember.firstName} ${teamMember.lastName}`}
                              </span>
                              <span className="mlmi-agent-email">{teamMember.email}</span>
                              {teamMember.agencyName && !teamMember.isInvite && (
                                <span className="mlmi-agent-agency">{teamMember.agencyName}</span>
                              )}
                              {teamMember.isInvite && (
                                <span className="mlmi-invite-badge">Send Invitation</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : teamMemberSearchQuery.length >= 2 ? (
                        <div className="mlmi-dropdown-no-results">No team members found</div>
                      ) : null}
                    </div>
                  )}
                </div>
                
                {/* Invitation status messages */}
                {inviteSuccess && (
                  <div className="mlmi-invite-success">
                    ✓ Invitation sent successfully!
                  </div>
                )}
                {inviteError && (
                  <div className="mlmi-invite-error">
                    {inviteError}
                  </div>
                )}
                {invitingTeamMember && (
                  <div className="mlmi-invite-loading">
                    Sending invitation...
                  </div>
                )}
              </div>
              )}
              
              {/* Selected Team Members List */}
              {(selectedTeamMembers.length > 0 || isUserTeamMember()) && (
                <div className="mlmi-selected-agents-list">
                  {/* Show current user if they are a team member */}
                  {isUserTeamMember() && (
                    <div className="mlmi-selected-agent-item mlmi-team-member-item">
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
                      <span className="mlmi-team-member-badge">Team Member</span>
                    </div>
                  )}
                  
                  {/* Show other team members */}
                  {selectedTeamMembers.map(teamMember => (
                    <div key={teamMember._id} className="mlmi-selected-agent-item mlmi-team-member-item">
                      <div className="mlmi-agent-info">
                        <span className="mlmi-agent-name">
                          {teamMember.isInvite ? `Invite ${teamMember.firstName} ${teamMember.lastName}` : `${teamMember.firstName} ${teamMember.lastName}`}
                        </span>
                        {teamMember.phone && (
                          <span className="mlmi-agent-phone">{teamMember.phone}</span>
                        )}
                        <span className="mlmi-agent-email">{teamMember.email}</span>
                        {teamMember.agencyName && (
                          <span className="mlmi-agent-agency">{teamMember.agencyName}</span>
                        )}
                      </div>
                      <div className="mlmi-agent-actions">
                        {teamMember.isInvite && (
                          <span className="mlmi-team-member-badge">Send Invitation</span>
                        )}
                        {(isUserPrimaryAgent() || isUserAdditionalAgent()) && (
                          <button
                            type="button"
                            className="mlmi-remove-agent-btn"
                            onClick={() => removeTeamMember(teamMember._id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Form Fields for Invite */}
              {selectedTeamMembers.some(tm => tm.isInvite) && (
                <div className="mlmi-invite-form-section">
                  <h4>Invitation Details</h4>
                  <div className="mlmi-form-row">
                    <div className="mlmi-form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        placeholder="Enter first name"
                        className="mlmi-form-control"
                        onChange={(e) => {
                          // Update the invite data with the entered name
                          const firstName = e.target.value;
                          setSelectedTeamMembers(prev => 
                            prev.map(tm => 
                              tm.isInvite ? { ...tm, firstName: firstName } : tm
                            )
                          );
                        }}
                      />
                    </div>
                    <div className="mlmi-form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        className="mlmi-form-control"
                        onChange={(e) => {
                          // Update the invite data with the entered name
                          const lastName = e.target.value;
                          setSelectedTeamMembers(prev => 
                            prev.map(tm => 
                              tm.isInvite ? { ...tm, lastName: lastName } : tm
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mlmi-invite-send-btn"
                    onClick={() => {
                      const invite = selectedTeamMembers.find(tm => tm.isInvite);
                      if (invite && invite.firstName && invite.lastName) {
                        inviteTeamMember(invite, invite.firstName, invite.lastName);
                      } else {
                        setError('Please fill in both first and last name for the invitation.');
                      }
                    }}
                    disabled={invitingTeamMember}
                  >
                    {invitingTeamMember ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              )}
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
