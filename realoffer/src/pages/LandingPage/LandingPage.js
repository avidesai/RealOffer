// LandingPage.js

import React, { useState, useEffect } from 'react';
import { ChevronRight, Home, FileText, Calendar, BarChart2, MessageCircle, DollarSign, Users, Inbox, FileSignature, PenTool, Zap, Shield, Clock, TrendingUp, Award, Smartphone, Globe, Search, Calculator } from 'lucide-react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import VisibilitySensor from 'react-visibility-sensor';
import logo from './images/logo.png';
import './LandingPage.css';

const Feature = ({ icon: Icon, title, description, highlight }) => (
  <div className={`feature ${highlight ? 'feature-highlight' : ''}`}>
    <div className="feature-icon-wrapper">
      <Icon className="feature-icon" />
    </div>
    <h3 className="feature-title">{title}</h3>
    <p className="feature-description">{description}</p>
  </div>
);

const Stat = ({ icon: Icon, value, description }) => (
  <VisibilitySensor partialVisibility offset={{ bottom: 200 }}>
    {({ isVisible }) => (
      <div className="landing-stat">
        <div className="landing-stat-icon-wrapper">
          <Icon className="landing-stat-icon" />
        </div>
        <CountUp start={0} end={isVisible ? value : 0} duration={2.75} redraw={true}>
          {({ countUpRef }) => <span ref={countUpRef} className="landing-stat-value" />}
        </CountUp>
        <p className="landing-stat-description">{description}</p>
      </div>
    )}
  </VisibilitySensor>
);

const LandingPage = () => {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const position = window.pageYOffset;
      setScrollPosition(position);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="landing-page">
      <Header />
      <main className="landing-main">
        <section className="hero">
          <div 
            className="hero-image" 
            style={{ transform: `translateY(${scrollPosition * 0.5}px)` }}
          ></div>
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="hero-logo">
              <img src={logo} alt="RealOffer logo" className="hero-logo-image" />
              <span className="hero-logo-text">RealOffer</span>
            </div>
            <h2 className="hero-title">The Complete Real Estate Transaction Platform</h2>
            <p className="hero-subtitle">Streamline your deals from listing to closing. Manage documents, analysis, offers, and communications all in one place.</p>
            <div className="hero-cta-group">
              <Link to="/signup" className="cta-button cta-primary">
                Try It For Free <ChevronRight className="cta-icon" />
              </Link>
              <Link to="/features" className="cta-button cta-secondary">
                See How It Works
              </Link>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="features-header">
            <h2 className="lp-section-title">Everything You Need to Close More Deals</h2>
            <p className="lp-section-subtitle">Built by agents, for agents. RealOffer streamlines every step of your real estate transactions.</p>
          </div>
          <div className="features-grid">
            <Feature
              icon={FileText}
              title="Smart Document Management"
              description="Upload, organize, and share disclosure documents instantly. AI-powered analysis helps identify key terms and potential issues."
              highlight={true}
            />
            <Feature
              icon={Zap}
              title="One-Click Offer Creation"
              description="Generate professional offer packages in minutes. Auto-fill forms, attach documents, and submit offers with confidence."
            />
            <Feature
              icon={Shield}
              title="Secure Digital Signatures"
              description="DocuSign integration for seamless document signing. Track completion status and maintain full audit trails."
            />
            <Feature
              icon={BarChart2}
              title="Real-Time Analytics"
              description="Track buyer engagement, document views, and offer activity. Make data-driven decisions to optimize your listings."
            />
            <Feature
              icon={Calculator}
              title="Property Analysis & Valuation"
              description="Get instant property valuations, rent estimates, and comparable sales data to make informed pricing decisions."
            />
            <Feature
              icon={Search}
              title="Market Intelligence"
              description="Access comprehensive market data and comparable properties to stay competitive and close deals faster."
            />
          </div>
        </section>

        <section className="benefits">
          <div className="benefits-container">
            <div className="benefits-content">
              <h2 className="benefits-title">Why Top Agents Choose RealOffer</h2>
              <div className="benefits-grid">
                <div className="benefit-item">
                  <Award className="benefit-icon" />
                  <h3>Close Deals Faster</h3>
                  <p>Reduce transaction time by up to 40% with streamlined document workflows and automated processes.</p>
                </div>
                <div className="benefit-item">
                  <DollarSign className="benefit-icon" />
                  <h3>Increase Your Revenue</h3>
                  <p>Handle more transactions simultaneously and never miss opportunities with 24/7 platform availability.</p>
                </div>
                <div className="benefit-item">
                  <Users className="benefit-icon" />
                  <h3>Delight Your Clients</h3>
                  <p>Provide a modern, professional experience that sets you apart and builds lasting client relationships.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stats">
          <div className="landing-stats-container">
            <Stat
              icon={Inbox}
              value={566}
              description="Offers Processed"
            />
            <Stat
              icon={Home}
              value={171}
              description="Properties Sold"
            />
            <Stat
              icon={Users}
              value={2625}
              description="Active Agents"
            />
          </div>
        </section>

        <section className="cta">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Real Estate Business?</h2>
            <p className="cta-subtitle">Join thousands of successful agents who are closing more deals with RealOffer</p>
            <div className="cta-buttons">
              <Link to="/signup" className="cta-button cta-primary">
                Try It For Free
              </Link>
              <Link to="/features" className="cta-button cta-secondary">
                Schedule a Demo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;