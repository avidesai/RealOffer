import React, { useState } from 'react';
import { X, MessageCircle, HelpCircle, Star, FileText, Mail, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './FeedbackModal.css';

const FeedbackModal = ({ userType, onClose }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('feedback');
  const [feedbackType, setFeedbackType] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedbackType || (!message.trim() && !rating)) return;

    setIsSubmitting(true);
    try {
      await submitFeedback({
        type: feedbackType,
        rating: rating,
        message: message.trim(),
        userType: userType
      });
      setSubmitted(true);
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

  const handleClose = () => {
    if (submitted) {
      onClose();
    } else {
      // Ask for confirmation if they haven't submitted
      if (message.trim() || rating) {
        if (window.confirm('Are you sure you want to close? Your feedback will be lost.')) {
          onClose();
        }
      } else {
        onClose();
      }
    }
  };

  if (submitted) {
    return (
      <div className="fm-overlay" onClick={handleClose}>
        <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="fm-header">
            <h2>Thank You! 🙏</h2>
            <button className="fm-close-button" onClick={handleClose}>
              <X size={20} />
            </button>
          </div>
          <div className="fm-content">
            <div className="fm-success-message">
              <Star size={48} className="fm-success-icon" />
              <h3>Your feedback has been submitted</h3>
              <p>We appreciate you taking the time to help us improve RealOffer. We'll review your feedback and get back to you if needed.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fm-overlay" onClick={handleClose}>
      <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fm-header">
          <h2>Feedback & Support</h2>
          <button className="fm-close-button" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="fm-tabs">
          <button
            className={`fm-tab-button ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <MessageCircle size={16} />
            Feedback
          </button>
          <button
            className={`fm-tab-button ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            <HelpCircle size={16} />
            Support
          </button>
        </div>

        <div className="fm-content">
          {activeTab === 'feedback' ? (
            <div className="feedback-tab">
              <div className="fm-feedback-type-selector">
                <h3>What type of feedback do you have?</h3>
                <div className="fm-feedback-type-buttons">
                  <button
                    className={`fm-type-button ${feedbackType === 'feature_request' ? 'selected' : ''}`}
                    onClick={() => setFeedbackType('feature_request')}
                  >
                    <Star size={16} />
                    Feature Request
                  </button>
                  <button
                    className={`fm-type-button ${feedbackType === 'bug_report' ? 'selected' : ''}`}
                    onClick={() => setFeedbackType('bug_report')}
                  >
                    <HelpCircle size={16} />
                    Bug Report
                  </button>
                  <button
                    className={`fm-type-button ${feedbackType === 'general' ? 'selected' : ''}`}
                    onClick={() => setFeedbackType('general')}
                  >
                    <MessageCircle size={16} />
                    General Feedback
                  </button>
                </div>
              </div>

              {feedbackType && (
                <>
                  <div className="fm-rating-section">
                    <h3>How would you rate your experience?</h3>
                    <div className="fm-rating-buttons">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          className={`fm-rating-button ${rating === value ? 'selected' : ''}`}
                          onClick={() => setRating(value)}
                        >
                          {value === 1 ? '😞' : value === 2 ? '😐' : value === 3 ? '😊' : value === 4 ? '😄' : '🤩'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="fm-message-section">
                    <h3>Tell us more (optional)</h3>
                    <textarea
                      className="fm-feedback-textarea"
                      placeholder="Share your thoughts, suggestions, or describe any issues you've encountered..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="support-tab">
              <div className="fm-support-options">
                <h3>How can we help you?</h3>
                
                <div className="fm-support-card">
                  <div className="fm-support-card-icon">
                    <FileText size={24} />
                  </div>
                  <div className="fm-support-card-content">
                    <h4>Documentation & Guides</h4>
                    <p>Learn how to use RealOffer effectively with our comprehensive guides.</p>
                    <a href="/features" className="fm-support-link">
                      View Documentation
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div className="fm-support-card">
                  <div className="fm-support-card-icon">
                    <Mail size={24} />
                  </div>
                  <div className="fm-support-card-content">
                    <h4>Email Support</h4>
                    <p>Get help from our support team via email.</p>
                    <a href="mailto:support@realoffer.com" className="fm-support-link">
                      Contact Support
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div className="fm-support-card">
                  <div className="fm-support-card-icon">
                    <MessageCircle size={24} />
                  </div>
                  <div className="fm-support-card-content">
                    <h4>Feature Request</h4>
                    <p>Suggest new features or improvements for RealOffer.</p>
                    <button 
                      className="fm-support-link-button"
                      onClick={() => setActiveTab('feedback')}
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'feedback' && feedbackType && (
          <div className="fm-footer">
            <button
              className="fm-submit-button"
              onClick={handleSubmit}
              disabled={isSubmitting || (!message.trim() && !rating)}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
