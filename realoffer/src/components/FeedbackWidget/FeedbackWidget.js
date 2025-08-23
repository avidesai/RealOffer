import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../../context/AuthContext';
import NewUserFeedback from './NewUserFeedback';
import StandardFeedback from './StandardFeedback';
import './FeedbackWidget.css';

const FeedbackWidget = () => {
  const { user } = useAuth();
  const [userType, setUserType] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lastShown, setLastShown] = useState(null);
  const [showFullWidget, setShowFullWidget] = useState(true);

  // Determine user type based on signup date
  useEffect(() => {
    if (!user?.createdAt) {
      // For testing purposes, if no createdAt, treat as new user
      setUserType('new');
      return;
    }

    const daysSinceSignup = Math.floor(
      (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSignup <= 7) {
      setUserType('new');
    } else if (daysSinceSignup <= 30) {
      setUserType('recent');
    } else {
      setUserType('established');
    }
  }, [user]);

  // Check if widget should be visible
  useEffect(() => {
    if (!userType) {
      return;
    }

    // Always show the widget (either full or circular icon)
    setIsVisible(true);

    // Check if user has interacted before to determine if we should show full widget
    const userId = user?.id || user?._id;
    const lastInteraction = localStorage.getItem(`feedback_interaction_${userId}`);
    
    if (lastInteraction) {
      // User has interacted before, show circular icon
      setShowFullWidget(false);
    } else {
      // First time user, show full widget
      setShowFullWidget(true);
    }
  }, [userType, user]);

  const handleInteraction = () => {
    setHasInteracted(true);
    const userId = user?.id || user?._id;
    localStorage.setItem(`feedback_interaction_${userId}`, new Date().toISOString());
    
    // Switch to circular icon mode
    setShowFullWidget(false);
  };

  const handleWidgetToggle = () => {
    setShowFullWidget(!showFullWidget);
  };

  const handleWidgetClose = () => {
    setShowFullWidget(false);
  };

  // Don't render if not visible or user type not determined
  if (!isVisible || !userType) {
    return null;
  }

  return (
    <>
      {showFullWidget ? (
        <NewUserFeedback 
          onInteraction={handleInteraction}
          onClose={handleWidgetClose}
        />
      ) : (
        <StandardFeedback 
          userType={userType}
          onToggle={handleWidgetToggle}
        />
      )}
    </>
  );
};

export default FeedbackWidget;
