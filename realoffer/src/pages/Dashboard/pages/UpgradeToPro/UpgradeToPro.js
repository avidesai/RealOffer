import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UpgradeHeader from './components/UpgradeHeader';
import Footer from './components/Footer';
import StripeWrapper from './components/StripeWrapper';
import StripePaymentForm from './components/StripePaymentForm';
import api from '../../../../context/api';
import './UpgradeToPro.css';
import { CheckCircle, Zap, BarChart2, MessageCircle, Brain, Users, Eye, Shield, Clock, TrendingUp } from 'lucide-react';

const proFeatures = [
  { icon: <BarChart2 size={22} />, title: 'Advanced Analytics & Insights', desc: "Get detailed buyer engagement metrics, document viewing patterns, and offer performance analytics." },
  { icon: <Brain size={22} />, title: 'AI-Powered Document Analysis', desc: 'Automatically analyze property disclosures, inspection reports, and contracts to identify key risks and opportunities.' },
  { icon: <MessageCircle size={22} />, title: 'Premium Communication Hub', desc: 'Secure messaging system with compliance tracking, automated notifications, and communication history.' },
  { icon: <Zap size={22} />, title: 'Automated Offer Generation', desc: 'Create professional offers instantly with pre-filled forms, document attachments, and e-signature integration.' },
  { icon: <TrendingUp size={22} />, title: 'Market Intelligence & Comps', desc: 'Access real-time property valuations, comparable sales data, and neighborhood market trends.' },
  { icon: <Users size={22} />, title: 'Unlimited Active Listings', desc: 'Manage unlimited property listings with premium organizational tools and bulk operations.' },
  { icon: <Eye size={22} />, title: 'Buyer Engagement Tracking', desc: 'See exactly who views your listings, which documents they access, and their engagement levels.' },
  { icon: <Shield size={22} />, title: 'Premium Security & Compliance', desc: 'Enhanced security features, audit trails, and compliance tools for professional real estate operations.' },
  { icon: <Clock size={22} />, title: 'Priority Support', desc: 'Get fast-track customer support with dedicated account management and technical assistance.' }
];

const UpgradeToProContent = () => {
  const [plan, setPlan] = useState('annual');
  const [coupon, setCoupon] = useState('');
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [validCoupon, setValidCoupon] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const navigate = useNavigate();

  const handleCouponChange = (event) => {
    setCoupon(event.target.value);
    // Reset coupon status when user types
    if (couponStatus) {
      setCouponStatus(null);
      setValidCoupon(null);
    }
  };

  const handleTermsChange = (event) => setTermsAccepted(event.target.checked);
  
  const handleCouponApply = async () => {
    if (!coupon.trim()) {
      setCouponStatus('error');
      return;
    }

    setCouponLoading(true);
    setPaymentError('');

    try {
      const response = await api.post('/api/stripe/validate-coupon', {
        couponCode: coupon.trim()
      });

      if (response.data.valid) {
        setCouponStatus('success');
        setValidCoupon(response.data.coupon);
      } else {
        setCouponStatus('error');
        setValidCoupon(null);
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      setCouponStatus('error');
      setValidCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePaymentSuccess = (subscription) => {
    console.log('Payment successful:', subscription);
    setPaymentSuccess(true);
    setPaymentError('');
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setPaymentError(error);
    setPaymentSuccess(false);
  };

  const getPrice = () => {
    if (plan === 'annual') {
      return { amount: '29', period: 'month', total: '348/year', savings: 'Save $60/year' };
    }
    return { amount: '34', period: 'month', total: '408/year', savings: null };
  };

  const currentPrice = getPrice();

  return (
    <div className="upgrade-page">
      <UpgradeHeader />
      <div className="upgrade-hero">
        <h1 className="upgrade-hero-title">Scale Your Real Estate Business</h1>
        <p className="upgrade-hero-subtitle">
          Unlock powerful tools that help you close more deals, understand your market better, and provide exceptional service to your clients.
        </p>
      </div>
      <div className="upgrade-main-content">
        <div className="upgrade-features-card">
          <h2 className="upgrade-features-title">Everything in Pro</h2>
          <div className="upgrade-features-grid">
            {proFeatures.map((f, i) => (
              <div className="upgrade-feature-item" key={i}>
                <div className="upgrade-feature-icon">{f.icon}</div>
                <div className="upgrade-feature-content">
                  <div className="upgrade-feature-title">{f.title}</div>
                  <div className="upgrade-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="upgrade-subscribe-card">
          <div className="upgrade-plan-toggle">
            <button 
              className={`plan-btn ${plan==='annual' ? 'active' : ''}`} 
              onClick={()=>setPlan('annual')}
            >
              Annual {currentPrice.savings && <span className="discount-badge">{currentPrice.savings}</span>}
            </button>
            <button 
              className={`plan-btn ${plan==='monthly' ? 'active' : ''}`} 
              onClick={()=>setPlan('monthly')}
            >
              Monthly
            </button>
          </div>
          <div className="upgrade-price-row">
            <span className="upgrade-price">${currentPrice.amount}</span>
            <span className="upgrade-price-desc">/ {currentPrice.period}</span>
          </div>
          <div className="upgrade-billing-note">
            <small>Billed {plan === 'annual' ? 'annually' : 'monthly'} • ${currentPrice.total}</small>
          </div>

          {/* Coupon Section */}
          <div className="upgrade-coupon-row">
            <input 
              type="text" 
              placeholder="Promo Code (Try: FREE2MONTHS)" 
              value={coupon} 
              onChange={handleCouponChange} 
              className="upgrade-input" 
            />
            <button 
              type="button" 
              className="upgrade-coupon-btn" 
              onClick={handleCouponApply}
              disabled={couponLoading}
            >
              {couponLoading ? 'Checking...' : 'Apply'}
            </button>
            {couponStatus==='success' && validCoupon && (
              <span className="coupon-success">
                {validCoupon.percentOff 
                  ? `${validCoupon.percentOff}% off` 
                  : `$${validCoupon.amountOff/100} off`} applied!
              </span>
            )}
            {couponStatus==='error' && <span className="coupon-error">Invalid promo code</span>}
          </div>

          {/* Payment Error/Success Messages */}
          {paymentError && (
            <div className="payment-error">
              {paymentError}
            </div>
          )}
          
          {paymentSuccess && (
            <div className="payment-success">
              Payment successful! Redirecting to dashboard...
            </div>
          )}

          {/* Stripe Payment Form */}
          <StripePaymentForm
            plan={plan}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            couponCode={couponStatus === 'success' ? coupon : ''}
            termsAccepted={termsAccepted}
          />

          {/* Terms */}
          <div className="upgrade-terms-row">
            <label className="upgrade-terms-label">
              <input type="checkbox" checked={termsAccepted} onChange={handleTermsChange} />
              I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            </label>
          </div>

          <div className="upgrade-summary">
            <h3>What's Included</h3>
            <ul>
              <li><CheckCircle className="upgrade-summary-check" size={16} /> Unlimited active listings</li>
              <li><CheckCircle className="upgrade-summary-check" size={16} /> Advanced buyer analytics</li>
              <li><CheckCircle className="upgrade-summary-check" size={16} /> AI document analysis</li>
              <li><CheckCircle className="upgrade-summary-check" size={16} /> Premium communication tools</li>
              <li><CheckCircle className="upgrade-summary-check" size={16} /> Market intelligence & comps</li>
              <li><CheckCircle className="upgrade-summary-check" size={16} /> Priority customer support</li>
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const UpgradeToPro = () => {
  return (
    <StripeWrapper>
      <UpgradeToProContent />
    </StripeWrapper>
  );
};

export default UpgradeToPro;
