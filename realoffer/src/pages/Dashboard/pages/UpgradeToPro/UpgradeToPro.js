import React, { useState } from 'react';
import UpgradeHeader from './components/UpgradeHeader';
import Footer from './components/Footer'; // Import the Footer component
import './UpgradeToPro.css';
import { CheckCircle, Zap, BarChart2, FileText, FileSignature, DollarSign, Brain } from 'lucide-react';

const proFeatures = [
  { icon: <BarChart2 size={22} />, title: 'Detailed Buyer Analytics', desc: "See who's viewing, downloading, and interacting with your listings." },
  { icon: <Zap size={22} />, title: 'Automated Offer Preparation', desc: 'Quickly generate, fill, and send offer documents with e-signatures.' },
  { icon: <Brain size={22} />, title: 'AI Property Analysis', desc: 'Get instant property valuations and up-to-date comps powered by AI.' },
  { icon: <FileText size={22} />, title: 'AI Disclosure Analysis', desc: 'AI reviews inspection and disclosure reports to highlight key risks.' },
];

const UpgradeToPro = () => {
  const [plan, setPlan] = useState('annual');
  const [coupon, setCoupon] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // null, 'success', 'error'
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handlePlanChange = (event) => setPlan(event.target.value);
  const handleCouponChange = (event) => setCoupon(event.target.value);
  const handleTermsChange = (event) => setTermsAccepted(event.target.checked);
  const handleCouponApply = () => {
    // Simulate coupon check
    if (coupon.trim().toLowerCase() === 'pro20') {
      setCouponStatus('success');
    } else {
      setCouponStatus('error');
    }
  };
  const handleEnrollClick = () => {
    if (!termsAccepted) {
      alert('You must agree to the terms and conditions.');
      return;
    }
    alert('Enrolled successfully!');
  };

  return (
    <div className="upgrade-page">
      <UpgradeHeader />
      <div className="upgrade-hero">
        <h1 className="upgrade-hero-title">Win More Listings. Close More Deals. Save More Time.</h1>
        <p className="upgrade-hero-subtitle">Unlock AI-powered insights, automated offer workflows, and next-level analytics—so you can focus on what matters: growing your business and delighting your clients.</p>
      </div>
      <div className="upgrade-main-content">
        <div className="upgrade-features-card">
          <h2 className="upgrade-features-title">What You Get With Pro</h2>
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
            <button className={`plan-btn ${plan==='annual' ? 'active' : ''}`} onClick={()=>setPlan('annual')}>Annual <span className="discount-badge">20% Off</span></button>
            <button className={`plan-btn ${plan==='monthly' ? 'active' : ''}`} onClick={()=>setPlan('monthly')}>Monthly</button>
          </div>
          <div className="upgrade-price-row">
            <span className="upgrade-price">${plan==='annual' ? '199' : '19'}</span>
            <span className="upgrade-price-desc">/ {plan==='annual' ? 'year' : 'month'}</span>
          </div>
          <form className="upgrade-payment-form" onSubmit={e=>e.preventDefault()}>
            <div className="upgrade-payment-fields">
              <input type="text" placeholder="Card Number" className="upgrade-input" maxLength={19} />
              <div className="upgrade-payment-row">
                <input type="text" placeholder="MM / YY" className="upgrade-input" maxLength={7} />
                <input type="text" placeholder="CVC" className="upgrade-input" maxLength={4} />
              </div>
              <input type="text" placeholder="Name on Card" className="upgrade-input" />
              <input type="text" placeholder="Billing Address" className="upgrade-input" />
              <div className="upgrade-payment-row">
                <input type="text" placeholder="City" className="upgrade-input" />
                <input type="text" placeholder="State" className="upgrade-input" />
                <input type="text" placeholder="ZIP" className="upgrade-input" />
              </div>
            </div>
            <div className="upgrade-coupon-row">
              <input type="text" placeholder="Coupon Code" value={coupon} onChange={handleCouponChange} className="upgrade-input" />
              <button type="button" className="upgrade-coupon-btn" onClick={handleCouponApply}>Apply</button>
              {couponStatus==='success' && <span className="coupon-success">Coupon applied!</span>}
              {couponStatus==='error' && <span className="coupon-error">Invalid coupon</span>}
            </div>
            <div className="upgrade-terms-row">
              <label className="upgrade-terms-label">
                <input type="checkbox" checked={termsAccepted} onChange={handleTermsChange} />
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
              </label>
            </div>
            <button className="upgrade-enroll-btn" onClick={handleEnrollClick} type="button">
              Enroll & Pay
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default UpgradeToPro;
