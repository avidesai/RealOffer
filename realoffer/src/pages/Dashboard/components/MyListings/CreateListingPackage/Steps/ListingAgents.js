// /CreateListingPackage/Steps/ListingAgents.js

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../../../../context/AuthContext';
import api from '../../../../../../context/api';
import './ListingAgents.css';

const ListingAgents = ({ formData, errors, handleChange, handleNextStep, handlePrevStep }) => {
  const { user, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  // Initialize with current user as primary agent
  useEffect(() => {
    if (user && !formData.agent1) {
      handleChange({
        target: {
          name: 'agent1',
          value: user._id,
        },
      });
    }
  }, [user, formData.agent1, handleChange]);

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

    setLoading(true);
    try {
      const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Filter out current user and already selected agents
      const filteredResults = response.data.filter(agent => 
        agent._id !== user._id && 
        !selectedAgents.some(selected => selected._id === agent._id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching agents:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
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
  const addAgent = (agent) => {
    setSelectedAgents(prev => [...prev, agent]);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Remove agent from selected list
  const removeAgent = (agentId) => {
    setSelectedAgents(prev => prev.filter(agent => agent._id !== agentId));
  };

  // Update form data when selected agents change
  useEffect(() => {
    const agentIds = selectedAgents.map(agent => agent._id);
    handleChange({
      target: {
        name: 'agentIds',
        value: agentIds,
      },
    });
  }, [selectedAgents, handleChange]);

  return (
    <div className="clp-step">
      <h2>Listing Agents</h2>
      
      {/* Primary Agent (Current User) */}
      <div className="clp-form-group">
        <label>Primary Agent</label>
        <div className="primary-agent-display">
          <div className="agent-info">
            <span className="agent-name">{`${user?.firstName} ${user?.lastName}`}</span>
            <span className="agent-email">{user?.email}</span>
          </div>
          <span className="primary-badge">Primary</span>
        </div>
        {errors.agent1 && <div className="clp-error">{errors.agent1}</div>}
      </div>

      {/* Additional Agents Search */}
      <div className="clp-form-group">
        <label>Additional Agents</label>
        <div className="agent-search-container" ref={dropdownRef}>
          <input
            type="text"
            placeholder="Search for agents by name or email..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setShowDropdown(true)}
            className="agent-search-input"
          />
          
          {showDropdown && (searchQuery.length > 0 || loading) && (
            <div className="agent-dropdown">
              {loading ? (
                <div className="dropdown-loading">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(agent => (
                  <div
                    key={agent._id}
                    className="dropdown-item"
                    onClick={() => addAgent(agent)}
                  >
                    <div className="agent-info">
                      <span className="agent-name">{`${agent.firstName} ${agent.lastName}`}</span>
                      <span className="agent-email">{agent.email}</span>
                      {agent.agencyName && (
                        <span className="agent-agency">{agent.agencyName}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : searchQuery.length >= 2 ? (
                <div className="dropdown-no-results">No agents found</div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Selected Agents List */}
      {selectedAgents.length > 0 && (
        <div className="clp-form-group">
          <label>Selected Additional Agents</label>
          <div className="selected-agents-list">
            {selectedAgents.map(agent => (
              <div key={agent._id} className="selected-agent-item">
                <div className="agent-info">
                  <span className="agent-name">{`${agent.firstName} ${agent.lastName}`}</span>
                  <span className="agent-email">{agent.email}</span>
                  {agent.agencyName && (
                    <span className="agent-agency">{agent.agencyName}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="remove-agent-btn"
                  onClick={() => removeAgent(agent._id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='clp-button-container'>
        <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
        <button className="clp-next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default ListingAgents;
