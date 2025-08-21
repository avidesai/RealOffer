// ShareUrl.js - UPDATED VERSION

import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../../../../../../../context/api';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './ShareUrl.css';

const ShareUrl = ({ isOpen, onClose, url, listingId }) => {
  console.log('ShareUrl component loaded - UPDATED VERSION');
  const { user, token } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Agent search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Invitation states
  const [invitingTeamMember, setInvitingTeamMember] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  
  // Listing data state
  const [currentListing, setCurrentListing] = useState(null);
  const [listingLoading, setListingLoading] = useState(false);
  
  const [shareData, setShareData] = useState({
    role: 'buyer',
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });

  // Fetch current listing to check agent count
  const fetchCurrentListing = useCallback(async () => {
    if (!listingId) return;
    
    setListingLoading(true);
    try {
      const response = await api.get(`/api/propertyListings/${listingId}`);
      setCurrentListing(response.data);
      
      // If listing agent option is no longer available, reset role to buyer
      if (response.data.agentIds && response.data.agentIds.length >= 2 && shareData.role === 'listingAgent') {
        setShareData(prev => ({
          ...prev,
          role: 'buyer'
        }));
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      // If there's an error fetching the listing, don't show listing agent option
      setCurrentListing(null);
    } finally {
      setListingLoading(false);
    }
  }, [listingId, shareData.role]);

  // Fetch current listing data when modal opens
  useEffect(() => {
    if (isOpen && listingId) {
      fetchCurrentListing();
    }
  }, [isOpen, listingId, fetchCurrentListing]);

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
      
      // Filter out current user and already selected agents (same as MoreInfo)
      const filteredResults = response.data.filter(agent => 
        agent._id !== user._id && 
        !currentListing?.agentIds?.some(existing => existing.toString() === agent._id) &&
        !currentListing?.teamMemberIds?.some(existing => existing.toString() === agent._id)
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

  // Add agent to selected
  const addAgent = (agent) => {
    if (agent.isInvite) {
      // For invite options, add to selected and show form fields
      setSelectedAgent(agent);
      setSearchQuery('');
      setShowDropdown(false);
    } else {
      // For existing users, add directly
      setSelectedAgent(agent);
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  // Invite team member who doesn't have an account
  const inviteTeamMember = async (inviteData) => {
    setInvitingTeamMember(true);
    setInviteError('');
    
    console.log('Sending team member invitation:', {
      email: inviteData.inviteEmail,
      firstName: shareData.firstName,
      lastName: shareData.lastName,
      listingId: listingId,
      propertyAddress: currentListing?.homeCharacteristics?.address || 'Property',
      inviterName: `${user.firstName} ${user.lastName}`
    });
    
    try {
      const endpoint = shareData.role === 'listingAgent' ? '/api/users/invite-listing-agent' : '/api/users/invite-team-member';
      
      const response = await api.post(endpoint, {
        email: inviteData.inviteEmail,
        firstName: shareData.firstName,
        lastName: shareData.lastName,
        listingId: listingId,
        propertyAddress: currentListing?.homeCharacteristics?.address || 'Property',
        inviterName: `${user.firstName} ${user.lastName}`,
        message: shareData.message || ''
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Invitation response:', response.data);

      setInviteSuccess(true);
      setIsExistingUser(response.data.userExists || false);
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedAgent(null);
      
      // Show success message for a few seconds
      setTimeout(() => {
        setInviteSuccess(false);
        setIsExistingUser(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error inviting team member:', error);
      setInviteError(error.response?.data?.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInvitingTeamMember(false);
    }
  };

  // Remove selected agent
  const removeAgent = () => {
    setSelectedAgent(null);
  };

  // Remove current user as agent (emergency function)
  const removeSelfAsAgent = async () => {
    try {
      const listingResponse = await api.get(`/api/propertyListings/${listingId}`);
      const currentListing = listingResponse.data;
      
      // Safety check: Never allow the creator to remove themselves as agent
      if (currentListing.createdBy.toString() === user._id) {
        setError('Cannot remove yourself as agent because you are the listing creator.');
        return;
      }
      
      const currentAgentIds = currentListing.agentIds || [];
      
      // Remove current user from agents
      const updatedAgentIds = currentAgentIds.filter(id => id.toString() !== user._id);
      
      await api.put(`/api/propertyListings/${listingId}`, {
        agentIds: updatedAgentIds
      });

      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error removing self as agent:', error);
      setError('Failed to remove yourself as agent. Please try again.');
    }
  };

  // Check if listing agent option should be available (max 2 agents)
  const canAddListingAgent = () => {
    // If we haven't fetched the listing data yet, don't show the option
    if (!currentListing) return false;
    // If agentIds is not available, don't show the option
    if (!currentListing.agentIds) return false;
    // Only show if there are fewer than 2 agents
    return currentListing.agentIds.length < 2;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShareData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update selectedAgent if it's an invite and we're updating firstName or lastName
    if (selectedAgent && selectedAgent.isInvite && (name === 'firstName' || name === 'lastName')) {
      setSelectedAgent(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSharePackage = async (e) => {
    e.preventDefault();
    
    if (shareData.role === 'listingAgent') {
      // Handle listing agent addition
      if (!selectedAgent) {
        setError('Please select an agent to add.');
        return;
      }

      setIsSharing(true);
      setError('');

      try {
        if (selectedAgent.isInvite) {
          // Handle agent invitation
          if (!shareData.firstName.trim() || !shareData.lastName.trim()) {
            setError('Please fill in the first and last name for the invitation.');
            return;
          }

          await inviteTeamMember(selectedAgent);
          
          setShareSuccess(true);
          setSelectedAgent(null);
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            setShareSuccess(false);
            onClose();
          }, 3000);
        } else {
          // Handle existing agent addition
          // Get current listing to preserve existing agents
          const listingResponse = await api.get(`/api/propertyListings/${listingId}`);
          const currentListing = listingResponse.data;
          const currentAgentIds = currentListing.agentIds || [];
          
          // Check if we're at the maximum agent limit (2 agents total)
          if (currentAgentIds.length >= 2) {
            setError('Maximum of 2 listing agents allowed. Please remove an existing agent first.');
            return;
          }
          
          // Check if the selected agent is already an agent
          if (currentAgentIds.some(id => id.toString() === selectedAgent._id)) {
            setError('This agent is already associated with this listing.');
            return;
          }
          
          // Special case: If we're at the limit and current user is not the creator, 
          // allow replacing the current user with the selected agent
          if (currentAgentIds.length >= 2) {
            const isCreator = currentListing.createdBy.toString() === user._id;
            if (isCreator) {
              setError('Maximum of 2 listing agents allowed. Please remove an existing agent first.');
              return;
            } else {
              // Replace current user with selected agent
              const updatedAgentIds = currentAgentIds.filter(id => id.toString() !== user._id);
              updatedAgentIds.push(selectedAgent._id);
              
              await api.put(`/api/propertyListings/${listingId}`, {
                agentIds: updatedAgentIds
              });

              setShareSuccess(true);
              setSelectedAgent(null);
              
              // Auto-close after 3 seconds
              setTimeout(() => {
                setShareSuccess(false);
                onClose();
              }, 3000);
              return;
            }
          }
          
          // Normal case: Add the selected agent to existing agents
          const updatedAgentIds = [...currentAgentIds, selectedAgent._id];
          
          await api.put(`/api/propertyListings/${listingId}`, {
            agentIds: updatedAgentIds
          });

          setShareSuccess(true);
          setSelectedAgent(null);
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            setShareSuccess(false);
            onClose();
          }, 3000);
        }
      } catch (error) {
        console.error('Error adding listing agent:', error);
        console.error('Error response data:', error.response?.data);
        console.error('Error status:', error.response?.status);
        setError(error.response?.data?.message || 'Failed to add listing agent. Please try again.');
      } finally {
        setIsSharing(false);
      }
    } else if (shareData.role === 'teamMember') {
      // Handle team member addition
      if (!selectedAgent) {
        setError('Please select a team member to add.');
        return;
      }

      setIsSharing(true);
      setError('');

      try {
        if (selectedAgent.isInvite) {
          // Handle team member invitation
          if (!shareData.firstName.trim() || !shareData.lastName.trim()) {
            setError('Please fill in the first and last name for the invitation.');
            return;
          }

          await inviteTeamMember(selectedAgent);
          
          setShareSuccess(true);
          setSelectedAgent(null);
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            setShareSuccess(false);
            onClose();
          }, 3000);
        } else {
          // Handle existing team member addition
          const listingResponse = await api.get(`/api/propertyListings/${listingId}`);
          const currentListing = listingResponse.data;
          const currentTeamMemberIds = currentListing.teamMemberIds || [];
          
          // Add the selected team member if not already present
          if (!currentTeamMemberIds.some(id => id.toString() === selectedAgent._id)) {
            const updatedTeamMemberIds = [...currentTeamMemberIds, selectedAgent._id];
            
            await api.put(`/api/propertyListings/${listingId}`, {
              teamMemberIds: updatedTeamMemberIds
            });

            setShareSuccess(true);
            setSelectedAgent(null);
            
            // Auto-close after 3 seconds
            setTimeout(() => {
              setShareSuccess(false);
              onClose();
            }, 3000);
          } else {
            setError('This team member is already associated with this listing.');
          }
        }
      } catch (error) {
        console.error('Error adding team member:', error);
        setError(error.response?.data?.message || 'Failed to add team member. Please try again.');
      } finally {
        setIsSharing(false);
      }
    } else {
      // Handle regular sharing (buyer/buyerAgent)
      // Validate required fields
      if (!shareData.firstName.trim() || !shareData.lastName.trim() || !shareData.email.trim()) {
        setError('Please fill in all required fields.');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(shareData.email)) {
        setError('Please enter a valid email address.');
        return;
      }

      setIsSharing(true);
      setError('');

      try {
        const response = await api.post('/api/propertyListings/share', {
          listingId,
          shareUrl: url,
          recipient: {
            role: shareData.role,
            firstName: shareData.firstName.trim(),
            lastName: shareData.lastName.trim(),
            email: shareData.email.trim().toLowerCase(),
            message: shareData.message.trim()
          }
        });

        if (response.status === 200) {
          setShareSuccess(true);
          // Reset form
          setShareData({
            role: 'buyer',
            firstName: '',
            lastName: '',
            email: '',
            message: ''
          });
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            setShareSuccess(false);
            onClose();
          }, 3000);
        }
      } catch (error) {
        console.error('Error sharing listing:', error);
        setError(error.response?.data?.message || 'Failed to share listing. Please try again.');
      } finally {
        setIsSharing(false);
      }
    }
  };

  const handleClose = () => {
    setShareSuccess(false);
    setError('');
    setSelectedAgent(null);
    setSearchQuery('');
    setListingLoading(false);
    setCurrentListing(null);
    setShareData({
      role: 'buyer',
      firstName: '',
      lastName: '',
      email: '',
      message: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="share-url-overlay">
      <div className="share-url-content">
        <div className="share-url-header">
          <h2>Share Package</h2>
          <button className="share-url-close-button" onClick={handleClose}></button>
        </div>
        
        {shareSuccess ? (
          <div className="share-url-success">
            <div className="share-url-success-icon">✓</div>
            <h3>
              {shareData.role === 'listingAgent' ? 'Agent Added Successfully!' : 
               shareData.role === 'teamMember' ? 'Team Member Added Successfully!' : 
               'Shared Successfully!'}
            </h3>
            <p>
              {shareData.role === 'listingAgent' 
                ? 'The agent has been added to this listing and will have access to all listing features.'
                : shareData.role === 'teamMember'
                ? 'The team member has been added to this listing and will have access to all listing features.'
                : 'An email has been sent with access to this listing.'
              }
            </p>
          </div>
        ) : (
          <div className="share-url-body">
            {/* Share Form Section */}
            <form onSubmit={handleSharePackage} className="share-url-form">
              <div className="share-url-form-row">
                <div className="share-url-form-group">
                  <label className="share-url-label">Role</label>
                  <select
                    name="role"
                    value={shareData.role}
                    onChange={handleInputChange}
                    className="share-url-select"
                    disabled={listingLoading}
                  >
                    <option value="buyer">Buyer</option>
                    <option value="buyerAgent">Buyer Agent</option>
                    <option value="teamMember">Team Member</option>
                    {!listingLoading && canAddListingAgent() && (
                      <option value="listingAgent">Listing Agent</option>
                    )}
                  </select>
                </div>
              </div>

              {(shareData.role === 'listingAgent' || shareData.role === 'teamMember') ? (
                // Agent/Team Member Search Interface
                <div className="share-url-form-row">
                  <div className="share-url-form-group full-width">
                    <label className="share-url-label">
                      {shareData.role === 'listingAgent' ? 'Search for Agent' : 'Search for Team Member'}
                    </label>
                    <div className="agent-search-container" ref={dropdownRef}>
                                          <input
                      type="text"
                      placeholder={shareData.role === 'listingAgent' 
                        ? "Search for agents by name or email..." 
                        : "Search for team members by name or email..."}
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => setShowDropdown(true)}
                      className="agent-search-input"
                    />

                      
                      {showDropdown && (searchQuery.length > 0 || searchLoading) && (
                        <div className="agent-dropdown">
                          {searchLoading ? (
                            <div className="dropdown-loading">Searching...</div>
                          ) : searchResults.length > 0 ? (
                            searchResults.map(agent => (
                              <div
                                key={agent._id}
                                className={`dropdown-item ${agent.isInvite ? 'invite-item' : ''}`}
                                onClick={() => addAgent(agent)}
                              >
                                <div className="agent-info">
                                  <span className="agent-name">
                                    {agent.isInvite ? `Invite ${agent.firstName} ${agent.lastName}` : `${agent.firstName} ${agent.lastName}`}
                                  </span>
                                  <span className="agent-email">{agent.email}</span>
                                  {agent.agencyName && !agent.isInvite && (
                                    <span className="agent-agency">{agent.agencyName}</span>
                                  )}
                                  {agent.isInvite && (
                                    <span className="invite-badge">Send Invitation</span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : searchQuery.length >= 2 ? (
                            <div className="dropdown-no-results">No {shareData.role === 'listingAgent' ? 'agents' : 'team members'} found</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    
                    {/* Invitation status messages */}
                    {inviteSuccess && (
                      <div className="invite-success">
                        ✓ {isExistingUser 
                          ? (shareData.role === 'listingAgent' ? 'User added as agent successfully!' : 'User added to team successfully!')
                          : 'Invitation sent successfully!'
                        }
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
                </div>
              ) : (
                // Regular Form Fields for Buyer/Buyer Agent
                <>
                  <div className="share-url-form-row">
                    <div className="share-url-form-group">
                      <label className="share-url-label">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={shareData.firstName}
                        onChange={handleInputChange}
                        placeholder="First Name"
                        className="share-url-input-field"
                        required
                      />
                    </div>
                    <div className="share-url-form-group">
                      <label className="share-url-label">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={shareData.lastName}
                        onChange={handleInputChange}
                        placeholder="Last Name"
                        className="share-url-input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="share-url-form-row">
                    <div className="share-url-form-group">
                      <label className="share-url-label">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={shareData.email}
                        onChange={handleInputChange}
                        placeholder="Email Address"
                        className="share-url-input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="share-url-form-row">
                    <div className="share-url-form-group">
                      <label className="share-url-label">Message (Optional)</label>
                      <textarea
                        name="message"
                        value={shareData.message}
                        onChange={handleInputChange}
                        placeholder="Enter a custom message for your recipient"
                        className="share-url-textarea"
                        rows="3"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Selected Agent/Team Member Display */}
              {(shareData.role === 'listingAgent' || shareData.role === 'teamMember') && selectedAgent && (
                <div className="share-url-form-row">
                  <div className="share-url-form-group full-width">
                    <label className="share-url-label">
                      {shareData.role === 'listingAgent' ? 'Selected Agent' : 'Selected Team Member'}
                    </label>
                    <div className="selected-agent-item">
                      <div className="agent-info">
                        <span className="agent-name">
                          {selectedAgent.isInvite ? `Invite ${selectedAgent.firstName} ${selectedAgent.lastName}` : `${selectedAgent.firstName} ${selectedAgent.lastName}`}
                        </span>
                        <span className="agent-email">{selectedAgent.email}</span>
                        {selectedAgent.agencyName && !selectedAgent.isInvite && (
                          <span className="agent-agency">{selectedAgent.agencyName}</span>
                        )}
                      </div>
                      <div className="agent-actions">
                        {selectedAgent.isInvite && (
                          <span className="team-member-badge">Send Invitation</span>
                        )}
                        <button
                          type="button"
                          className="remove-agent-btn"
                          onClick={removeAgent}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields for Invite */}
              {(shareData.role === 'listingAgent' || shareData.role === 'teamMember') && selectedAgent && selectedAgent.isInvite && (
                <>
                  <div className="share-url-form-row">
                    <div className="share-url-form-group">
                      <label className="share-url-label">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={shareData.firstName}
                        onChange={handleInputChange}
                        placeholder="First Name"
                        className="share-url-input-field"
                        required
                      />
                    </div>
                    <div className="share-url-form-group">
                      <label className="share-url-label">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={shareData.lastName}
                        onChange={handleInputChange}
                        placeholder="Last Name"
                        className="share-url-input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="share-url-form-row">
                    <div className="share-url-form-group">
                      <label className="share-url-label">Message (Optional)</label>
                      <textarea
                        name="message"
                        value={shareData.message}
                        onChange={handleInputChange}
                        placeholder="Enter a custom message for your recipient"
                        className="share-url-textarea"
                        rows="3"
                      />
                    </div>
                  </div>
                </>
              )}

              {error && <div className="share-url-error">{error}</div>}

              {/* Emergency option: Remove self as agent if stuck */}
              {shareData.role === 'listingAgent' && currentListing && currentListing.agentIds && 
               currentListing.agentIds.length >= 2 && 
               currentListing.agentIds.some(id => id.toString() === user._id) &&
               currentListing.createdBy.toString() !== user._id && (
                <div className="share-url-emergency-section">
                  <p className="share-url-emergency-text">
                    <strong>Emergency:</strong> You are currently a listing agent but not the creator. 
                    If you need to remove yourself to add the correct agent, click below:
                  </p>
                  <button
                    type="button"
                    className="share-url-emergency-button"
                    onClick={removeSelfAsAgent}
                  >
                    Remove Myself as Agent
                  </button>
                </div>
              )}

              <div className="share-url-actions">
                <button 
                  type="button"
                  className="share-url-copy-button"
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
                <button 
                  type="submit"
                  className="share-url-share-button"
                  disabled={isSharing || ((shareData.role === 'listingAgent' || shareData.role === 'teamMember') && !selectedAgent)}
                >
                  {isSharing 
                    ? (shareData.role === 'listingAgent' ? 'Adding...' : 
                       shareData.role === 'teamMember' ? 'Adding...' : 'Sharing...') 
                    : (shareData.role === 'listingAgent' ? 'Add Listing Agent' : 
                       shareData.role === 'teamMember' ? 'Add Team Member' : 'Share Package')
                  }
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareUrl;
