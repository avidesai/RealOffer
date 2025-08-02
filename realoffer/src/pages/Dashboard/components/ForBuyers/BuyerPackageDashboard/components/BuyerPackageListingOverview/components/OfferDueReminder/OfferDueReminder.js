// OfferDueReminder.js

import React from 'react';
import { calculateOfferDueReminder, formatDueDate } from '../../../../../../../../../../utils/offerDueDateReminder';
import './OfferDueReminder.css';

function OfferDueReminder({ offerDueDate }) {
  const reminder = calculateOfferDueReminder(offerDueDate);
  
  if (!reminder) return null;
  
  return (
    <div className={`offer-due-reminder ${reminder.type}`}>
      <div className="reminder-content">
        <div className="reminder-icon">
          {reminder.urgent && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {!reminder.urgent && reminder.type === 'warning' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {!reminder.urgent && reminder.type === 'normal' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {reminder.type === 'expired' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
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