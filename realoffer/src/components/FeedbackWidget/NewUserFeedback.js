import React, { useState } from 'react';
import { MessageCircle, HelpCircle, Star, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NewUserFeedback = ({ onInteraction, onModalOpen }) => {
  const { token } = useAuth();
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleRatingClick = async (selectedRating) => {
    setRating(selectedRating);
    onInteraction();
    
    // Submit rating immediately
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
    onInteraction();
    setTimeout(() => {
      // Component will be unmounted by parent
    }, 500);
  };

  const handleNeedHelp = () => {
    onModalOpen();
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    try {
      await submitFeedback({
        type: 'feature_request',
        message: feedback,
        userType: 'new'
      });
      setFeedback('');
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
        <X size={14} />
      </button>
      
      <h3>
        <Star size={20} />
        How's your first week going?
      </h3>
      
      <p>We'd love to hear about your experience with RealOffer so far!</p>
      
      <div className="fw-rating-buttons">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            className={`fw-rating-button ${rating === value ? 'selected' : ''}`}
            onClick={() => handleRatingClick(value)}
            disabled={isSubmitting}
            aria-label={`Rate ${value} out of 5`}
          >
            {value === 1 ? '😞' : value === 2 ? '😐' : value === 3 ? '😊' : value === 4 ? '😄' : '🤩'}
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
          <MessageCircle size={16} />
          Send Feedback
        </button>
        
        <button
          className="fw-feedback-button"
          onClick={handleNeedHelp}
          disabled={isSubmitting}
        >
          <HelpCircle size={16} />
          Need Help?
        </button>
      </div>
    </div>
  );
};

export default NewUserFeedback;
