import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import UpgradeHeader from './components/UpgradeHeader';
import Footer from './components/Footer';
import StripeWrapper from './components/StripeWrapper';
import StripePaymentForm from './components/StripePaymentForm';
import api from '../../../../context/api';
import './UpgradeToPro.css';
import { BarChart2, Brain, TrendingUp, Users } from 'lucide-react';

// Agent features (includes unlimited listings)
const agentProFeatures = [
  { icon: <BarChart2 size={24} />, title: 'Advanced Analytics & Insights', desc: 'Track buyer engagement, document views, and offer activity in real time.' },
  { icon: <Brain size={24} />, title: 'AI Document Analysis', desc: 'Instantly review disclosures and reports for key risks and insights.' },
  { icon: <TrendingUp size={24} />, title: 'Market Intelligence & Comps', desc: 'Access up-to-date property valuations and comparable sales data.' },
  { icon: <Users size={24} />, title: 'Unlimited Active Listings', desc: 'Manage as many listings as you need—no limits, ever.' },
];

// Buyer features (no unlimited listings, more buyer-focused)
const buyerProFeatures = [
  { icon: <BarChart2 size={24} />, title: 'Track Buyer Activity', desc: 'Track buyer interest, document views, and offer activity on properties.' },
  { icon: <Brain size={24} />, title: 'AI Document Analysis', desc: 'Instantly review disclosures and reports for key risks and insights.' },
  { icon: <TrendingUp size={24} />, title: 'Market Intelligence & Comps', desc: 'Access up-to-date property valuations and comparable sales data.' },
];

const ANNUAL_PRICE = 199;
const MONTHLY_PRICE = 19;
const ANNUAL_MONTHLY_EQUIV = (ANNUAL_PRICE / 12).toFixed(2);
const ANNUAL_SAVINGS = Math.round((1 - (ANNUAL_PRICE / (MONTHLY_PRICE * 12))) * 100); // e.g. 13%

const UpgradeToProContent = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState(user?.role === 'buyer' ? 'monthly' : 'annual');
  const [coupon, setCoupon] = useState('');
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [validCoupon, setValidCoupon] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const navigate = useNavigate();

  // Determine if user is a buyer
  const isBuyer = user?.role === 'buyer';
  
  // Select appropriate features based on user role
  const proFeatures = isBuyer ? buyerProFeatures : agentProFeatures;

  const handleCouponChange = (event) => {
    setCoupon(event.target.value);
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
      setCouponStatus('error');
      setValidCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePaymentSuccess = (subscription) => {
    setPaymentSuccess(true);
    setPaymentError('');
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const handlePaymentError = (error) => {
    setPaymentError(error);
    setPaymentSuccess(false);
  };

  const getPrice = () => {
    if (plan === 'annual') {
      return { 
        amount: ANNUAL_PRICE, 
        period: 'year', 
        total: `${ANNUAL_PRICE}/year`, 
        savings: ANNUAL_SAVINGS, 
        monthlyEquivalent: ANNUAL_MONTHLY_EQUIV 
      };
    }
    return { 
      amount: MONTHLY_PRICE, 
      period: 'month', 
      total: `${MONTHLY_PRICE}/month`, 
      savings: null, 
      monthlyEquivalent: null 
    };
  };
  const currentPrice = getPrice();

  return (
    <div className="upgrade-page">
      <UpgradeHeader />
      <div className="upgrade-hero">
        <h1 className="upgrade-hero-title">
          {isBuyer ? 'Get Your Dream Home Faster' : 'Scale Your Real Estate Business'}
        </h1>
        <p className="upgrade-hero-subtitle">
          {isBuyer 
            ? 'Get exclusive access to advanced tools and listing insights—designed for serious homebuyers.'
            : 'Supercharge your business with next level tools and insights—built for top agents.'
          }
        </p>
      </div>
      <div className="upgrade-main-content">
        <div className="upgrade-features-card">
          <h2 className="upgrade-features-title">
            {isBuyer ? 'Everything in Pro for Homebuyers' : 'Everything in Pro'}
          </h2>
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
          <div className="upgrade-plan-toggle modern-toggle">
            <button 
              className={`plan-btn ${plan==='annual' ? 'active' : ''}`} 
              onClick={()=>setPlan('annual')}
            >
              Annual
              {currentPrice.savings && (
                <span className="discount-badge">
                  Save {currentPrice.savings}% 
                </span>
              )}
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
            {plan === 'annual' ? (
              <small>
                Billed once per year.
              </small>
            ) : (
              <small>
                Billed monthly. Cancel anytime.
              </small>
            )}
          </div>
          <div className="upgrade-coupon-row">
            <input 
              type="text" 
              placeholder="Promo Code" 
              value={coupon} 
              onChange={handleCouponChange} 
              className="upgrade-input coupon-input" 
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
          <StripePaymentForm
            plan={plan}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            couponCode={couponStatus === 'success' ? coupon : ''}
            termsAccepted={termsAccepted}
            onTermsChange={handleTermsChange}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};

const UpgradeToPro = () => (
  <StripeWrapper>
    <UpgradeToProContent />
  </StripeWrapper>
);

export default UpgradeToPro;
