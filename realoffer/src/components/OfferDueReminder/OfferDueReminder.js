// OfferDueReminder.js

import React from 'react';
import { calculateOfferDueReminder, formatDueDate } from '../../utils/offerDueDateReminder';
import './OfferDueReminder.css';

function OfferDueReminder({ offerDueDate }) {
  const reminder = calculateOfferDueReminder(offerDueDate);
  
  if (!reminder) return null;
  
  return (
    <div className={`offer-due-reminder ${reminder.type}`}>
      <div className="reminder-content">
        <div className="reminder-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="reminder-text">
          <span className="reminder-message">{reminder.text}</span>
          {reminder.type !== 'expired' && (
            <span className="reminder-date">{formatDueDate(offerDueDate)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default OfferDueReminder; 