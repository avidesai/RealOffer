import React, { useState, useEffect } from 'react';
import { MessageCircle, HelpCircle } from 'lucide-react';

const StandardFeedback = ({ userType, onModalOpen }) => {
  const [animation, setAnimation] = useState('');

  // Add subtle animations to draw attention
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimation('pulse');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setAnimation('bounce');
    onModalOpen();
    
    // Reset animation after bounce
    setTimeout(() => {
      setAnimation('');
    }, 1000);
  };

  // Choose icon based on user type
  const getIcon = () => {
    if (userType === 'recent') {
      return <HelpCircle size={24} />;
    }
    return <MessageCircle size={24} />;
  };

  return (
    <div 
      className={`fw-widget fw-standard-feedback ${animation}`}
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
