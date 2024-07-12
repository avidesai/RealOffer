import React, { useState } from 'react';
import UpgradeHeader from './components/UpgradeHeader';
import Footer from './components/Footer'; // Import the Footer component
import './UpgradeToPro.css';

const UpgradeToPro = () => {
  const [plan, setPlan] = useState('annual');
  const [coupon, setCoupon] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handlePlanChange = (event) => {
    setPlan(event.target.value);
  };

  const handleCouponChange = (event) => {
    setCoupon(event.target.value);
  };

  const handleTermsChange = (event) => {
    setTermsAccepted(event.target.checked);
  };

  const handleEnrollClick = () => {
    if (termsAccepted) {
      alert('Enrolled successfully!');
    } else {
      alert('You must agree to the terms and conditions.');
    }
  };

  return (
    <div className="upgrade-page">
      <UpgradeHeader />
      <div className="upgrade-container">
        <h1 className="upgrade-title">Subscribe to Pro</h1>
        <p className="upgrade-description">
          Purchase a Pro account to get the most out of RealOffer.
        </p>
        <div className="upgrade-content">
          <div className="benefits-section">
            <h2>Pro Benefits</h2>
            <h3>Listing Agents</h3>
            <ul>
              <li><strong>Listing Activity:</strong> View detailed buyer activity including views, downloads, and document interactions.</li>
              <li><strong>Listing Messaging:</strong> Communicate seamlessly with buyers and buyer agents directly through the platform.</li>
              <li><strong>AI Listing Price Suggestion:</strong> Utilize AI to intelligently price properties based on MLS data, disclosure documents, images, and comparable sales.</li>
              <li><strong>One Click Offer:</strong> Automatically generate signature packages for buyers, complete with AI-driven document processing and signature placement.</li>
            </ul>
            <h3>Buyer's Agents</h3>
            <ul>
              <li><strong>Listing Activity:</strong> Monitor listing activity and see how other buyers are engaging with the property.</li>
              <li><strong>Listing Messaging:</strong> Directly message the listing agent to inquire about the property and receive prompt responses.</li>
              <li><strong>AI Offer Price Suggestion:</strong> Leverage AI to determine the optimal offer price using comprehensive data and comparable sales.</li>
              <li><strong>One Click Offer:</strong> Streamline the offer submission process with auto-populated contracts and signature packets.</li>
            </ul>
          </div>
          <div className="subscription-section">
            <div className="plan-section">
              <h2>Choose a Plan</h2>
              <label>
                <input
                  type="radio"
                  value="annual"
                  checked={plan === 'annual'}
                  onChange={handlePlanChange}
                />
                Annually at $199 <span className="discount-tag">20% Off</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="monthly"
                  checked={plan === 'monthly'}
                  onChange={handlePlanChange}
                />
                Monthly at $19
              </label>
            </div>
            <div className="payment-section">
              <h2>Payment</h2>
              <div className="credit-card">
                <label>CARD NUMBER</label>
                <input type="text" placeholder="1234 1234 1234 1234" />
                <div className="expiration-cvc">
                  <div>
                    <label>EXPIRATION</label>
                    <input type="text" placeholder="MM / YY" />
                  </div>
                  <div>
                    <label>CVC</label>
                    <input type="text" placeholder="CVC" />
                  </div>
                </div>
              </div>
              <div className="billing-address">
                <h3>BILLING ADDRESS</h3>
                <label>NAME ON CARD</label>
                <input type="text" />
                <label>ADDRESS</label>
                <input type="text" />
                <div className="city-state-zip">
                  <div>
                    <label>CITY</label>
                    <input type="text" />
                  </div>
                  <div>
                    <label>STATE</label>
                    <input type="text" />
                  </div>
                  <div>
                    <label>ZIP</label>
                    <input type="text" />
                  </div>
                </div>
              </div>
            </div>
            <div className="promotion-section">
              <h2>Promotion</h2>
              <input
                type="text"
                placeholder="COUPON CODE"
                value={coupon}
                onChange={handleCouponChange}
              />
              <button className="redeem-button">REDEEM COUPON</button>
            </div>
            <div className="terms-section">
              <label>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={handleTermsChange}
                />
                I agree to the <a href="www.google.com">Terms of Service</a> and <a href="www.google.com">Privacy Policy</a>.
              </label>
            </div>
            <div className="enroll-section">
              <p>
                You are enrolling in a subscription that recurs {plan === 'annual' ? 'yearly' : 'monthly'}.
              </p>
              <p>
                Your total today is <strong>${plan === 'annual' ? '199' : '19'}</strong> for the first {plan === 'annual' ? 'year' : 'month'}.
              </p>
              <button className="enroll-button" onClick={handleEnrollClick}>
                ENROLL AND PAY
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer /> {/* Add Footer component here */}
    </div>
  );
};

export default UpgradeToPro;
