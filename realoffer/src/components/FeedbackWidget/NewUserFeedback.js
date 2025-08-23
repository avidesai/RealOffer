import React, { useState } from 'react';
import { HelpCircle, Star, X, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NewUserFeedback = ({ onInteraction, onClose }) => {
  const { token } = useAuth();
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleRatingClick = async (selectedRating) => {
    setRating(selectedRating);
    
    // Submit rating immediately but don't close the widget
    setIsSubmitting(true);
    try {
      await submitFeedback({
        type: 'rating',
        rating: selectedRating,
        userType: 'new'
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    // Call the parent's close handler instead of interaction
    if (onClose) {
      onClose();
    }
    // Also call interaction to record the close action
    onInteraction();
  };

  const handleContact = () => {
    window.location.href = 'mailto:avi@realoffer.io?subject=RealOffer Support Request';
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Submit to backend (includes email functionality)
      await submitFeedback({
        type: 'feature_request',
        message: feedback,
        userType: 'new'
      });
      
      setFeedback('');
      
      // Close the widget after successful submission
      onInteraction();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFeedback = async (data) => {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }

    return response.json();
  };

  return (
    <div className={`fw-widget fw-new-user-feedback ${isClosing ? 'slide-out' : ''}`}>
      <button className="fw-close-button" onClick={handleClose} aria-label="Close feedback">
        <X size={12} />
      </button>
      
      <h3>
        How's your first week going?
      </h3>
      
      <div className="fw-rating-buttons">
        {[
          { value: 1, emoji: '😞', label: 'Not great' },
          { value: 3, emoji: '😊', label: 'Good' },
          { value: 5, emoji: '🤩', label: 'Amazing' }
        ].map(({ value, emoji, label }) => (
          <button
            key={value}
            className={`fw-rating-button ${rating === value ? 'selected' : ''}`}
            onClick={() => handleRatingClick(value)}
            disabled={isSubmitting}
            aria-label={label}
            title={label}
          >
            {emoji}
          </button>
        ))}
      </div>
      
      <textarea
        className="fw-feedback-input"
        placeholder="What would make RealOffer better for you? (optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        disabled={isSubmitting}
      />
      
      <div className="fw-feedback-actions">
        <button
          className="fw-feedback-button primary"
          onClick={handleSubmitFeedback}
          disabled={!feedback.trim() || isSubmitting}
        >
          <MessageCircle size={12} />
          Send Feedback
        </button>
        
        <button
          className="fw-feedback-button"
          onClick={handleContact}
          disabled={isSubmitting}
        >
          <HelpCircle size={12} />
          Contact
        </button>
      </div>
    </div>
  );
};

export default NewUserFeedback;
