// trialUtils.js

// Check if user has premium access (either paid or on trial)
export const hasPremiumAccess = (user) => {
  if (!user) {
    console.log('hasPremiumAccess: No user provided');
    return false;
  }
  
  console.log('hasPremiumAccess check:', {
    userId: user._id || user.id,
    email: user.email,
    isPremium: user.isPremium,
    isOnTrial: user.isOnTrial,
    trialEndDate: user.trialEndDate,
    userData: user
  });
  
  // If user has paid premium, they have access
  if (user.isPremium) {
    console.log('hasPremiumAccess: User has paid premium');
    return true;
  }
  
  // If user is on trial, check if trial is still active
  if (user.isOnTrial && user.trialEndDate) {
    const now = new Date();
    const trialEnd = new Date(user.trialEndDate);
    const isActive = now < trialEnd;
    console.log('hasPremiumAccess: Trial check', {
      now: now.toISOString(),
      trialEnd: trialEnd.toISOString(),
      isActive
    });
    return isActive;
  }
  
  console.log('hasPremiumAccess: No premium access');
  return false;
};

// Get trial status
export const getTrialStatus = (user) => {
  if (!user || !user.isOnTrial) {
    return 'no_trial';
  }
  
  if (!user.trialEndDate) {
    return 'active';
  }
  
  const now = new Date();
  const trialEnd = new Date(user.trialEndDate);
  
  if (now < trialEnd) {
    return 'active';
  } else {
    return 'expired';
  }
};

// Get days remaining in trial
export const getTrialDaysRemaining = (user) => {
  if (!user || !user.isOnTrial || !user.trialEndDate) {
    return null;
  }
  
  const now = new Date();
  const trialEnd = new Date(user.trialEndDate);
  
  if (now >= trialEnd) {
    return 0; // Trial has expired
  }
  
  const timeDiff = trialEnd.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  return daysDiff;
};

// Format trial end date for display
export const formatTrialEndDate = (trialEndDate) => {
  if (!trialEndDate) return null;
  
  const date = new Date(trialEndDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Get trial status message
export const getTrialStatusMessage = (user) => {
  if (!user) return null;
  
  const status = getTrialStatus(user);
  const daysRemaining = getTrialDaysRemaining(user);
  
  switch (status) {
    case 'no_trial':
      return null;
    case 'active':
      if (daysRemaining === null) {
        return 'Trial active';
      } else if (daysRemaining === 1) {
        return 'Trial ends tomorrow';
      } else if (daysRemaining <= 7) {
        return `Trial ends in ${daysRemaining} days`;
      } else {
        return `Trial ends ${formatTrialEndDate(user.trialEndDate)}`;
      }
    case 'expired':
      return 'Trial expired';
    default:
      return null;
  }
};

// Check if trial is expiring soon (within 7 days)
export const isTrialExpiringSoon = (user) => {
  const daysRemaining = getTrialDaysRemaining(user);
  return daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
};

// Check if trial has expired
export const isTrialExpired = (user) => {
  const daysRemaining = getTrialDaysRemaining(user);
  return daysRemaining !== null && daysRemaining <= 0;
};

// Get trial urgency level for UI styling
export const getTrialUrgencyLevel = (user) => {
  if (!user || !user.isOnTrial) return 'none';
  
  const daysRemaining = getTrialDaysRemaining(user);
  
  if (daysRemaining === null) return 'none';
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 1) return 'urgent';
  if (daysRemaining <= 3) return 'warning';
  if (daysRemaining <= 7) return 'notice';
  
  return 'none';
}; 