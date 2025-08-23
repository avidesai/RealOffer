import React from 'react';
import { MessageCircle } from 'lucide-react';

const StandardFeedback = ({ userType, onToggle }) => {
  const handleClick = () => {
    onToggle();
  };

  // Choose icon based on user type
  const getIcon = () => {
    // Always use MessageCircle for the circular icon
    return <MessageCircle size={20} />;
  };

  return (
    <div 
      className="fw-widget fw-standard-feedback"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Open feedback and support"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {getIcon()}
    </div>
  );
};

export default StandardFeedback;
