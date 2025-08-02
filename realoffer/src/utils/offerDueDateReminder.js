// offerDueDateReminder.js

export const calculateOfferDueReminder = (offerDueDate) => {
  if (!offerDueDate) return null;
  
  const now = new Date();
  const dueDate = new Date(offerDueDate);
  
  // Check if the date is valid
  if (isNaN(dueDate.getTime())) return null;
  
  const timeDiff = dueDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));
  const minutesDiff = Math.ceil(timeDiff / (1000 * 60));
  
  // If the due date has passed
  if (timeDiff < 0) {
    return {
      text: "Offers closed",
      type: "expired",
      urgent: false
    };
  }
  
  // Within the last hour
  if (hoursDiff <= 1) {
    return {
      text: minutesDiff <= 0 ? "Offers due now!" : `Offers due in ${minutesDiff} minute${minutesDiff !== 1 ? 's' : ''}`,
      type: "urgent",
      urgent: true
    };
  }
  
  // Within the last 24 hours
  if (daysDiff <= 1) {
    return {
      text: `Offers due in ${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''}`,
      type: "urgent",
      urgent: true
    };
  }
  
  // Within 7 days
  if (daysDiff <= 7) {
    return {
      text: `Offers due in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`,
      type: "warning",
      urgent: false
    };
  }
  
  // More than 7 days
  return {
    text: `Offers due in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`,
    type: "normal",
    urgent: false
  };
};

export const formatDueDate = (offerDueDate) => {
  if (!offerDueDate) return null;
  
  const dueDate = new Date(offerDueDate);
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return dueDate.toLocaleDateString('en-US', options);
}; 