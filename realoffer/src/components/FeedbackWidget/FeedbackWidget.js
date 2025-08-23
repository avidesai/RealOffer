import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../../context/AuthContext';
import NewUserFeedback from './NewUserFeedback';
import StandardFeedback from './StandardFeedback';
import FeedbackModal from './FeedbackModal';
import './FeedbackWidget.css';

const FeedbackWidget = () => {
  const { user } = useAuth();
  const [userType, setUserType] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastShown, setLastShown] = useState(null);

  // Determine user type based on signup date
  useEffect(() => {
    if (!user?.createdAt) return;

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
    if (!userType) return;

    // For new users, show immediately
    if (userType === 'new') {
      setIsVisible(true);
      return;
    }

    // For established users, check if they've interacted recently
    const lastInteraction = localStorage.getItem(`feedback_interaction_${user.id}`);
    if (lastInteraction) {
      const daysSinceInteraction = Math.floor(
        (new Date() - new Date(lastInteraction)) / (1000 * 60 * 60 * 24)
      );
      
      // Show for established users if no interaction in last 7 days
      if (daysSinceInteraction >= 7) {
        setIsVisible(true);
      }
    } else {
      // First time user, show the widget
      setIsVisible(true);
    }
  }, [userType, user]);

  const handleInteraction = () => {
    setHasInteracted(true);
    localStorage.setItem(`feedback_interaction_${user.id}`, new Date().toISOString());
    
    // For new users, hide after interaction
    if (userType === 'new') {
      setTimeout(() => setIsVisible(false), 500);
    }
  };

  const handleModalOpen = () => {
    setShowModal(true);
    handleInteraction();
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  // Don't render if not visible or user type not determined
  if (!isVisible || !userType) {
    return null;
  }

  return (
    <>
      {userType === 'new' ? (
        <NewUserFeedback 
          onInteraction={handleInteraction}
          onModalOpen={handleModalOpen}
        />
      ) : (
        <StandardFeedback 
          userType={userType}
          onModalOpen={handleModalOpen}
        />
      )}
      
      {showModal && (
        <FeedbackModal 
          userType={userType}
          onClose={handleModalClose}
        />
      )}
    </>
  );
};

export default FeedbackWidget;
