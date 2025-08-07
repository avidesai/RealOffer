// offerDueDateReminder.js

export const calculateOfferDueReminder = (offerDueDate) => {
  if (!offerDueDate) return null;
  
  const now = new Date();
  const dueDate = new Date(offerDueDate);
  
  // Check if the date is valid
  if (isNaN(dueDate.getTime())) return null;
  
  const timeDiff = dueDate.getTime() - now.getTime();
  
  // Calculate calendar days difference
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const calendarDaysDiff = Math.ceil((dueDateOnly.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
  
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
      text: minutesDiff <= 0 ? "Offers due now" : `Offers due in ${minutesDiff} minute${minutesDiff !== 1 ? 's' : ''}`,
      type: "urgent",
      urgent: true
    };
  }
  
  // Within the last 24 hours (same calendar day or next day)
  if (calendarDaysDiff <= 1) {
    return {
      text: `Offers due in ${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''}`,
      type: "urgent",
      urgent: true
    };
  }
  
  // Within 7 days
  if (calendarDaysDiff <= 7) {
    // Use natural language for common cases
    if (calendarDaysDiff === 0) {
      return {
        text: "Offers due today",
        type: "urgent",
        urgent: true
      };
    } else if (calendarDaysDiff === 1) {
      return {
        text: "Offers due tomorrow",
        type: "warning",
        urgent: false
      };
    } else {
      return {
        text: `Offers due in ${calendarDaysDiff} day${calendarDaysDiff !== 1 ? 's' : ''}`,
        type: "warning",
        urgent: false
      };
    }
  }
  
  // More than 7 days
  return {
    text: `Offers due in ${calendarDaysDiff} day${calendarDaysDiff !== 1 ? 's' : ''}`,
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