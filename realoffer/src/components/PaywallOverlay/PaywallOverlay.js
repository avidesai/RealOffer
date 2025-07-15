import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Brain, TrendingUp, Users, Lock, Sparkles, Crown } from 'lucide-react';
import './PaywallOverlay.css';

const PaywallOverlay = ({ 
  feature, 
  featureTitle, 
  featureDescription, 
  featureIcon, 
  benefits = [], 
  ctaText = "Upgrade to Pro", 
  showProBadge = true,
  variant = "overlay" // "overlay" or "inline"
}) => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    navigate('/upgrade');
  };

  const defaultBenefits = [
    { icon: <BarChart2 size={18} />, text: "Advanced Analytics & Insights" },
    { icon: <Brain size={18} />, text: "AI-Powered Document Analysis" },
    { icon: <TrendingUp size={18} />, text: "Market Intelligence & Comps" },
    { icon: <Users size={18} />, text: "Unlimited Active Listings" }
  ];

  const displayBenefits = benefits.length > 0 ? benefits : defaultBenefits;

  return (
    <div className={`paywall-container ${variant}`}>
      <div className="paywall-content">
        <div className="paywall-header">
          {showProBadge && (
            <div className="paywall-pro-badge">
              <Crown size={16} />
              <span>Pro Feature</span>
            </div>
          )}
          <div className="paywall-icon">
            {featureIcon || <Lock size={48} />}
          </div>
          <h2 className="paywall-title">{featureTitle}</h2>
          <p className="paywall-description">{featureDescription}</p>
        </div>

        <div className="paywall-benefits">
          <h3 className="paywall-benefits-title">
            <Sparkles size={20} />
            Unlock Pro Features
          </h3>
          <ul className="paywall-benefits-list">
            {displayBenefits.map((benefit, index) => (
              <li key={index} className="paywall-benefit-item">
                <span className="paywall-benefit-icon">{benefit.icon}</span>
                <span className="paywall-benefit-text">{benefit.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="paywall-cta">
          <button 
            className="paywall-upgrade-button"
            onClick={handleUpgradeClick}
          >
            {ctaText}
          </button>
          <p className="paywall-cta-note">
            Join thousands of successful agents closing more deals
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaywallOverlay; 