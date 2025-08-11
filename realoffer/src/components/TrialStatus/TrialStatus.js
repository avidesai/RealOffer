import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getTrialStatus, 
  getTrialDaysRemaining, 
  getTrialStatusMessage, 
  getTrialUrgencyLevel,
  isTrialExpired,
  isTrialExpiringSoon
} from '../../utils/trialUtils';
import './TrialStatus.css';

const TrialStatus = ({ 
  showUpgradeButton = true, 
  compact = false, 
  className = '',
  onUpgradeClick 
}) => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  const trialStatus = getTrialStatus(user);
  const daysRemaining = getTrialDaysRemaining(user);
  const statusMessage = getTrialStatusMessage(user);
  const urgencyLevel = getTrialUrgencyLevel(user);
  const expired = isTrialExpired(user);
  const expiringSoon = isTrialExpiringSoon(user);
  
  // Don't show anything if user has no trial or has paid premium
  if (trialStatus === 'no_trial' || user.isPremium) {
    return null;
  }
  
  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      window.location.href = '/upgrade-to-pro';
    }
  };
  
  if (compact) {
    return (
      <div className={`trial-status-compact trial-status-${urgencyLevel} ${className}`}>
        <span className="trial-status-text">{statusMessage}</span>
        {showUpgradeButton && (expired || expiringSoon) && (
          <button 
            className="trial-upgrade-button-compact"
            onClick={handleUpgradeClick}
          >
            Upgrade
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className={`trial-status trial-status-${urgencyLevel} ${className}`}>
      <div className="trial-status-content">
        <div className="trial-status-icon">
          {urgencyLevel === 'urgent' && <span className="icon">⚠️</span>}
          {urgencyLevel === 'warning' && <span className="icon">⚠️</span>}
          {urgencyLevel === 'notice' && <span className="icon">ℹ️</span>}
          {urgencyLevel === 'expired' && <span className="icon">⏰</span>}
        </div>
        
        <div className="trial-status-info">
          <div className="trial-status-message">{statusMessage}</div>
          {daysRemaining !== null && daysRemaining > 0 && (
            <div className="trial-days-remaining">
              {daysRemaining === 1 ? '1 day left' : `${daysRemaining} days left`}
            </div>
          )}
        </div>
        
        {showUpgradeButton && (expired || expiringSoon) && (
          <button 
            className="trial-upgrade-button"
            onClick={handleUpgradeClick}
          >
            {expired ? 'Upgrade Now' : 'Upgrade'}
          </button>
        )}
      </div>
      
      {expired && (
        <div className="trial-expired-notice">
          Your trial has ended. Upgrade to continue using premium features.
        </div>
      )}
    </div>
  );
};

export default TrialStatus; 