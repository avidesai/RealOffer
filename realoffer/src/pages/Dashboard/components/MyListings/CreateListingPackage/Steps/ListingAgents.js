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
  
  // Team member states
  const [teamMemberSearchQuery, setTeamMemberSearchQuery] = useState('');
  const [teamMemberSearchResults, setTeamMemberSearchResults] = useState([]);
  const [showTeamMemberDropdown, setShowTeamMemberDropdown] = useState(false);
  const [teamMemberLoading, setTeamMemberLoading] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  
  // Invitation states
  const [invitingTeamMember, setInvitingTeamMember] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');
  
  const searchTimeoutRef = useRef(null);
  const teamMemberSearchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const teamMemberDropdownRef = useRef(null);

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

  // Initialize selected team members from formData
  useEffect(() => {
    if (formData.teamMembers && formData.teamMembers.length > 0) {
      setSelectedTeamMembers(formData.teamMembers);
    }
  }, [formData.teamMembers]);

  // Handle click outside dropdowns
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

    setLoading(true);
    try {
      const response = await api.get(`/api/users/search?query=${encodeURIComponent(query)}`, {
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

  // Search for team members
  const searchTeamMembers = async (query) => {
    if (!query || query.trim().length < 2) {
      setTeamMemberSearchResults([]);
      return;
    }

    setTeamMemberLoading(true);
    try {
      const response = await api.get(`/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Filter out current user, already selected agents, and already selected team members
      const filteredResults = response.data.filter(agent => 
        agent._id !== user._id && 
        !selectedAgents.some(selected => selected._id === agent._id) &&
        !selectedTeamMembers.some(selected => selected._id === agent._id)
      );
      
      setTeamMemberSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching team members:', error);
      setTeamMemberSearchResults([]);
    } finally {
      setTeamMemberLoading(false);
    }
  };

  // Handle search input change for agents
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

  // Handle search input change for team members
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
  const addAgent = (agent) => {
    const newSelectedAgents = [...selectedAgents, agent];
    setSelectedAgents(newSelectedAgents);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
    
    // Update form data directly
    const agentIds = newSelectedAgents.map(agent => agent._id);
    handleChange({
      target: {
        name: 'agentIds',
        value: agentIds,
      },
    });
  };

  // Remove agent from selected list
  const removeAgent = (agentId) => {
    const newSelectedAgents = selectedAgents.filter(agent => agent._id !== agentId);
    setSelectedAgents(newSelectedAgents);
    
    // Update form data directly
    const agentIds = newSelectedAgents.map(agent => agent._id);
    handleChange({
      target: {
        name: 'agentIds',
        value: agentIds,
      },
    });
  };

  // Add team member to selected list
  const addTeamMember = (teamMember) => {
    if (teamMember.isInvite) {
      // For invite options, add to selected and show form fields
      setSelectedTeamMembers([...selectedTeamMembers, teamMember]);
      setTeamMemberSearchQuery('');
      setTeamMemberSearchResults([]);
      setShowTeamMemberDropdown(false);
    } else {
      // For existing users, add directly
      if (selectedTeamMembers.length >= 5) {
        alert('Maximum of 5 team members allowed.');
        return;
      }
      setSelectedTeamMembers([...selectedTeamMembers, teamMember]);
      setTeamMemberSearchQuery('');
      setTeamMemberSearchResults([]);
      setShowTeamMemberDropdown(false);
    }
    
    // Update form data with team members
    const updatedTeamMembers = [...selectedTeamMembers, teamMember];
    handleChange({
      target: {
        name: 'teamMembers',
        value: updatedTeamMembers,
      },
    });
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
        listingId: 'new', // This is for a new listing
        propertyAddress: 'New Property Listing',
        inviterName: `${user.firstName} ${user.lastName}`
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

  // Remove team member from selected list
  const removeTeamMember = (teamMemberId) => {
    const newSelectedTeamMembers = selectedTeamMembers.filter(teamMember => teamMember._id !== teamMemberId);
    setSelectedTeamMembers(newSelectedTeamMembers);
    
    // Update form data with team members
    handleChange({
      target: {
        name: 'teamMembers',
        value: newSelectedTeamMembers,
      },
    });
  };

  return (
    <div className="clp-step">
      <h2>Listing Agents</h2>
      
      {/* Additional Agents Search - Only show if less than 2 total agents */}
      {selectedAgents.length < 1 && (
        <div className="clp-form-group">
          <label>Add Additional Agents</label>
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
      )}

      {/* All Agents List */}
      <div className="selected-agents-list">
        {/* Primary Agent (Current User) - Always First */}
        <div className="selected-agent-item">
          <div className="agent-info">
            <span className="agent-name">{`${user?.firstName} ${user?.lastName}`}</span>
            {user?.phone && (
              <span className="agent-phone">{user.phone}</span>
            )}
            <span className="agent-email">{user?.email}</span>
            {user?.agencyName && (
              <span className="agent-agency">{user.agencyName}</span>
            )}
          </div>
          <span className="primary-badge">Primary</span>
        </div>
        
        {/* Additional Agents */}
        {selectedAgents.map(agent => (
          <div key={agent._id} className="selected-agent-item">
            <div className="agent-info">
              <span className="agent-name">{`${agent.firstName} ${agent.lastName}`}</span>
              {agent.phone && (
                <span className="agent-phone">{agent.phone}</span>
              )}
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

      {/* Team Members Section */}
      <div className="team-members-section">
        <h3>Team Members</h3>
        <p className="team-members-description">
          Add team members who will have access to manage this listing. Team members will not be displayed to buyers or other external parties.
        </p>
        
        <div className="clp-form-group">
          <label>Add Team Members</label>
          <div className="agent-search-container" ref={teamMemberDropdownRef}>
            <input
              type="text"
              placeholder="Search for team members by name or email..."
              value={teamMemberSearchQuery}
              onChange={handleTeamMemberSearchChange}
              onFocus={() => setShowTeamMemberDropdown(true)}
              className="agent-search-input"
            />
            
            {showTeamMemberDropdown && (teamMemberSearchQuery.length > 0 || teamMemberLoading) && (
              <div className="agent-dropdown">
                {teamMemberLoading ? (
                  <div className="dropdown-loading">Searching...</div>
                ) : teamMemberSearchResults.length > 0 ? (
                  teamMemberSearchResults.map(teamMember => (
                    <div
                      key={teamMember._id}
                      className={`dropdown-item ${teamMember.isInvite ? 'invite-item' : ''}`}
                                              onClick={() => addTeamMember(teamMember)}
                    >
                      <div className="agent-info">
                        <span className="agent-name">
                          {teamMember.isInvite ? `Invite ${teamMember.firstName} ${teamMember.lastName}` : `${teamMember.firstName} ${teamMember.lastName}`}
                        </span>
                        <span className="agent-email">{teamMember.email}</span>
                        {teamMember.agencyName && !teamMember.isInvite && (
                          <span className="agent-agency">{teamMember.agencyName}</span>
                        )}
                        {teamMember.isInvite && (
                          <span className="invite-badge">Send Invitation</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : teamMemberSearchQuery.length >= 2 ? (
                  <div className="dropdown-no-results">No team members found</div>
                ) : null}
              </div>
            )}
          </div>
          
          {/* Invitation status messages */}
          {inviteSuccess && (
            <div className="invite-success">
              ✓ Invitation sent successfully!
            </div>
          )}
          {inviteError && (
            <div className="invite-error">
              {inviteError}
            </div>
          )}
          {invitingTeamMember && (
            <div className="invite-loading">
              Sending invitation...
            </div>
          )}
        </div>

        {/* Selected Team Members List */}
        {selectedTeamMembers.length > 0 && (
          <div className="selected-agents-list">
            {selectedTeamMembers.map(teamMember => (
              <div key={teamMember._id} className="selected-agent-item team-member-item">
                <div className="agent-info">
                  <span className="agent-name">
                    {teamMember.isInvite ? `Invite ${teamMember.firstName} ${teamMember.lastName}` : `${teamMember.firstName} ${teamMember.lastName}`}
                  </span>
                  {teamMember.phone && (
                    <span className="agent-phone">{teamMember.phone}</span>
                  )}
                  <span className="agent-email">{teamMember.email}</span>
                  {teamMember.agencyName && !teamMember.isInvite && (
                    <span className="agent-agency">{teamMember.agencyName}</span>
                  )}
                </div>
                                  <div className="agent-actions">
                    {teamMember.isInvite && (
                      <span className="team-member-badge">Send Invitation</span>
                    )}
                    <button
                      type="button"
                      className="remove-agent-btn"
                      onClick={() => removeTeamMember(teamMember._id)}
                    >
                      ×
                    </button>
                  </div>
              </div>
                          ))}
            </div>
          )}

          {/* Form Fields for Invite */}
          {selectedTeamMembers.some(tm => tm.isInvite) && (
            <div className="invite-form-section">
              <h4>Team Member Details</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    placeholder="Enter first name"
                    className="form-control"
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
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    placeholder="Enter last name"
                    className="form-control"
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
              <p className="invite-note">
                * Team member invitation will be sent automatically when the listing package is created.
              </p>
            </div>
          )}
        </div>

      {errors.agent1 && <div className="clp-error">{errors.agent1}</div>}

      {/* Validation for invite team members */}
      {selectedTeamMembers.some(tm => tm.isInvite && (!tm.firstName || !tm.lastName)) && (
        <div className="clp-error">
          Please fill in both first and last name for all invited team members.
        </div>
      )}

      <div className='clp-button-container'>
        <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
        <button 
          className="clp-next-button" 
          onClick={handleNextStep}
          disabled={selectedTeamMembers.some(tm => tm.isInvite && (!tm.firstName || !tm.lastName))}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ListingAgents;
