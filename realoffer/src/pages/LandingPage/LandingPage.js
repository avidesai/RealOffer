// LandingPage.js

import React, { useState, useEffect } from 'react';
import { Home, FileText, BarChart2, MessageCircle, DollarSign, Users, Inbox, Zap, Shield, Clock, TrendingUp, Star, ArrowRight, Play, CheckCircle, Sparkles, Menu, X, Trophy, Calculator } from 'lucide-react';
import Footer from '../../components/Footer/Footer';
import { Link, useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import VisibilitySensor from 'react-visibility-sensor';
import logo from './images/logo.png';
import heroDesktopImage from './images/hero-desktop-image.png';
import { useAuth } from '../../context/AuthContext';
import './LandingPage.css';

// Landing Page Header Component
const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Use IntersectionObserver to detect if hero is in view
    const hero = document.querySelector('.lp-hero');
    if (!hero) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const handleLoginClick = (e) => {
    if (user) {
      e.preventDefault();
      navigate('/dashboard');
    }
  };

  const handleLogoutClick = (e) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  return (
    <header className={`lp-landing-header ${isScrolled ? 'lp-landing-header-scrolled' : ''}`}>
      <div className="lp-landing-header-container">
        <Link to="/" className="lp-landing-header-logo">
          <img src={logo} alt="RealOffer" className="lp-landing-header-logo-image" />
          <span className="lp-landing-header-logo-text">RealOffer</span>
        </Link>

        <nav className={`lp-landing-header-nav ${isMobileMenuOpen ? 'lp-landing-header-nav-open' : ''}`}>
          {/* No Features link here anymore */}
          <div className="lp-landing-header-mobile-actions">
            <Link to="/login" className="lp-landing-header-login" onClick={handleLoginClick}>
              {user ? 'Dashboard' : 'Log In'}
            </Link>
            {user ? (
              <button className="lp-landing-header-signup" onClick={handleLogoutClick}>
                Log Out
              </button>
            ) : (
              <Link to="/signup" className="lp-landing-header-signup">
                Get Started
              </Link>
            )}
          </div>
        </nav>

        <div className="lp-landing-header-actions">
          <Link to="/features" className="lp-landing-header-nav-link">Features</Link>
          <span className="lp-landing-header-divider" />
          <Link to="/login" className="lp-landing-header-login" onClick={handleLoginClick}>
            {user ? 'Dashboard' : 'Log In'}
          </Link>
          {user ? (
            <button className="lp-landing-header-signup" onClick={handleLogoutClick}>
              Log Out
            </button>
          ) : (
            <Link to="/signup" className="lp-landing-header-signup">
              Get Started
            </Link>
          )}
        </div>

        <button 
          className="lp-landing-header-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
};

const Feature = ({ icon: Icon, title, description, highlight }) => (
  <div className={`lp-feature ${highlight ? 'lp-feature-highlight' : ''}`}>
    <div className="lp-feature-icon-wrapper">
      <Icon className="lp-feature-icon" />
    </div>
    <h3 className="lp-feature-title">{title}</h3>
    <p className="lp-feature-description">{description}</p>
  </div>
);

const Stat = ({ icon: Icon, value, suffix, description }) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  
  return (
    <VisibilitySensor partialVisibility offset={{ bottom: 200 }}>
      {({ isVisible }) => {
        if (isVisible && !hasAnimated) {
          setHasAnimated(true);
        }
        
        return (
          <div className="lp-landing-stat">
            <div className="lp-landing-stat-icon-wrapper">
              <Icon className="lp-landing-stat-icon" />
            </div>
            <div className="lp-landing-stat-value-wrapper">
              <CountUp 
                start={0} 
                end={hasAnimated ? value : 0} 
                duration={2.75} 
                redraw={false}
                useEasing={true}
              >
                {({ countUpRef }) => <span ref={countUpRef} className="lp-landing-stat-value" />}
              </CountUp>
              {suffix && <span className="lp-landing-stat-suffix">{suffix}</span>}
            </div>
            <p className="lp-landing-stat-description">{description}</p>
          </div>
        );
      }}
    </VisibilitySensor>
  );
};

const Testimonial = ({ quote, author, role, company, rating }) => (
  <div className="lp-testimonial">
    <div className="lp-testimonial-rating">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} className="lp-testimonial-star" fill="currentColor" />
      ))}
    </div>
    <p className="lp-testimonial-quote">"{quote}"</p>
    <div className="lp-testimonial-author">
      <div className="lp-testimonial-author-info">
        <p className="lp-testimonial-author-name">{author}</p>
        <p className="lp-testimonial-author-role">{role}, {company}</p>
      </div>
    </div>
  </div>
);

const PricingCard = ({ title, price, period, features, highlighted, ctaText }) => (
  <div className={`lp-pricing-card ${highlighted ? 'lp-pricing-card-highlighted' : ''}`}>
    {highlighted && <div className="lp-pricing-badge">Most Popular</div>}
    <div className="lp-pricing-header">
      <h3 className="lp-pricing-title">{title}</h3>
      <div className="lp-pricing-price">
        <span className="lp-pricing-currency">$</span>
        <span className="lp-pricing-amount">{price}</span>
        <span className="lp-pricing-period">/{period}</span>
      </div>
    </div>
    <ul className="lp-pricing-features">
      {features.map((feature, index) => (
        <li key={index} className="lp-pricing-feature">
          <CheckCircle className="lp-pricing-feature-icon" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <Link to="/signup" className={`lp-pricing-cta ${highlighted ? 'lp-pricing-cta-primary' : 'lp-pricing-cta-secondary'}`}>
      {ctaText}
    </Link>
  </div>
);

const LandingPage = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    {
      quote: "RealOffer has transformed how I manage my listings. The document management and offer tracking features save me hours every week.",
      author: "Sarah Chen",
      role: "Top Producer",
      company: "Keller Williams",
      rating: 5
    },
    {
      quote: "The AI-powered document analysis caught issues I would have missed. It's like having a transaction coordinator available 24/7.",
      author: "Michael Rodriguez",
      role: "Broker",
      company: "RE/MAX",
      rating: 5
    },
    {
      quote: "My clients love the professional experience. Being able to submit offers instantly gives us a competitive edge in hot markets.",
      author: "Emily Thompson",
      role: "Luxury Specialist",
      company: "Compass",
      rating: 5
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="landing-page">
      <LandingHeader />
      <main className="landing-main">
        {/* Hero Section */}
        <section className="lp-hero">
          <div className="lp-hero-background">
            <div className="lp-hero-gradient-orb lp-hero-gradient-orb-1"></div>
            <div className="lp-hero-gradient-orb lp-hero-gradient-orb-2"></div>
            <div className="lp-hero-grid-pattern"></div>
          </div>
          <div className="lp-hero-content">
            <div className="lp-hero-badge">
              <Sparkles className="lp-hero-badge-icon" />
              <span>Trusted by 2,625+ Real Estate Professionals</span>
            </div>
            <h1 className="lp-hero-title">
              Close More Deals with<br />
              <span className="lp-hero-title-gradient">Intelligent Real Estate Tools</span>
            </h1>
            <p className="lp-hero-subtitle">
              The all-in-one platform that streamlines listings, analysis, offers, and transactions. 
              Save time, reduce errors, and deliver exceptional client experiences.
            </p>
            <div className="lp-hero-cta-group">
              <Link to="/signup" className="lp-hero-cta-primary">
                Get Started For Free
                <ArrowRight className="lp-hero-cta-icon" />
              </Link>
              <button className="lp-hero-cta-secondary">
                <Play className="lp-hero-play-icon" />
                Watch Demo
              </button>
            </div>
            <div className="lp-hero-trust-badges">
              <div className="lp-hero-trust-badge">
                <DollarSign className="lp-hero-trust-icon" />
                <span>Win More Listings</span>
              </div>
              <div className="lp-hero-trust-badge">
                <Clock className="lp-hero-trust-icon" />
                <span>Save Hours Per Deal</span>
              </div>
              <div className="lp-hero-trust-badge">
                <Trophy className="lp-hero-trust-icon" />
                <span>Beat Other Offers</span>
              </div>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-hero-dashboard-preview">
              <div className="lp-hero-dashboard-window">
                <div className="lp-hero-dashboard-header">
                  <div className="lp-hero-dashboard-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className="lp-hero-dashboard-content">
                  <img src={heroDesktopImage} alt="RealOffer platform dashboard preview" className="lp-hero-dashboard-image" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="lp-trust-bar">
          <div className="lp-trust-bar-content">
            <p className="lp-trust-bar-text">Trusted by leading brokerages</p>
            <div className="lp-trust-bar-logos">
              <div className="lp-trust-logo">Keller Williams</div>
              <div className="lp-trust-logo">RE/MAX</div>
              <div className="lp-trust-logo">Compass</div>
              <div className="lp-trust-logo">Coldwell Banker</div>
              <div className="lp-trust-logo">Intero</div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="lp-features">
          <div className="lp-features-header">
            <span className="lp-section-badge">Features</span>
            <h2 className="lp-section-title">Everything You Need to Succeed</h2>
            <p className="lp-section-subtitle">
              Powerful tools designed by agents, for agents. Streamline every aspect of your real estate business.
            </p>
          </div>
          <div className="lp-features-grid">
            <Feature
              icon={FileText}
              title="Smart Document Hub"
              description="Host disclosure documents and use AI to analyze reports instantly."
            />
            <Feature
              icon={Zap}
              title="Lightning-Fast Offers"
              description="Create and submit professional offers in under 5 minutes."
            />
            <Feature
              icon={Shield}
              title="Secure E-Signatures"
              description="DocuSign integration allows you to e-sign offer documents and track progress."
            />
            <Feature
              icon={BarChart2}
              title="Real Time Analytics"
              description="Track document views, downloads, offers, and buyer engagement across your listings."
            />
            <Feature
              icon={Calculator}
              title="Market Intelligence"
              description="Simplify pricing with instant valuations, comps, and rental estimates for your listings."
            />
            <Feature
              icon={MessageCircle}
              title="Unified Communications"
              description="Keep all parties connected with in-platform messaging and notifications."
            />
          </div>
        </section>

        {/* How It Works Section */}
        <section className="lp-how-it-works">
          <div className="lp-how-it-works-content">
            <div className="lp-how-it-works-header">
              <span className="lp-section-badge">Process</span>
              <h2 className="lp-section-title">Close Deals in 3 Simple Steps</h2>
            </div>
            <div className="lp-how-it-works-steps">
              <div className="lp-how-step">
                <div className="lp-how-step-number">1</div>
                <div className="lp-how-step-content">
                  <h3>Create Your Listing</h3>
                  <p>Upload documents, add property details, and publish your listing in minutes.</p>
                </div>
              </div>
              <div className="lp-how-step-connector"></div>
              <div className="lp-how-step">
                <div className="lp-how-step-number">2</div>
                <div className="lp-how-step-content">
                  <h3>Manage Offers</h3>
                  <p>Receive, review, and respond to offers through our intuitive dashboard.</p>
                </div>
              </div>
              <div className="lp-how-step-connector"></div>
              <div className="lp-how-step">
                <div className="lp-how-step-number">3</div>
                <div className="lp-how-step-content">
                  <h3>Close with Confidence</h3>
                  <p>E-sign documents, track progress, and close deals faster than ever.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="lp-benefits">
          <div className="lp-benefits-container">
            <div className="lp-benefits-header">
              <span className="lp-section-badge">Benefits</span>
              <h2 className="lp-section-title">Why Top Agents Choose RealOffer</h2>
            </div>
            <div className="lp-benefits-grid">
              <div className="lp-benefit-card">
                <div className="lp-benefit-icon-wrapper">
                  <TrendingUp className="lp-benefit-icon" />
                </div>
                <h3>Simplify Your Workflow</h3>
                <p>RealOffer makes listing, managing, and making offers easier than ever—so you can focus on what matters most.</p>
                <Link to="/features" className="lp-benefit-link">
                  Learn how <ArrowRight className="lp-benefit-link-icon" />
                </Link>
              </div>
              <div className="lp-benefit-card">
                <div className="lp-benefit-icon-wrapper">
                  <Users className="lp-benefit-icon" />
                </div>
                <h3>5-Star Client Experience</h3>
                <p>Professional tools that impress clients and increase your business.</p>
                <Link to="/features" className="lp-benefit-link">
                  See features <ArrowRight className="lp-benefit-link-icon" />
                </Link>
              </div>
              <div className="lp-benefit-card">
                <div className="lp-benefit-icon-wrapper">
                  <DollarSign className="lp-benefit-icon" />
                </div>
                <h3>Grow Your Deal Volume</h3>
                <p>Unlock the ability to handle more clients and close more deals with less effort and fewer mistakes.</p>
                <Link to="/features" className="lp-benefit-link">
                  Get started <ArrowRight className="lp-benefit-link-icon" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="lp-landing-stats">
          <div className="lp-landing-stats-container">
            <Stat
              icon={Clock}
              value={4.8}
              suffix="hrs"
              description="Avg. Time Saved/Week"
            />
            <Stat
              icon={Inbox}
              value={2500}
              suffix="+"
              description="Offers Received"
            />
            <Stat
              icon={Home}
              value={15000}
              suffix="+"
              description="Properties Listed"
            />
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="lp-testimonials">
          <div className="lp-testimonials-container">
            <div className="lp-testimonials-header">
              <span className="lp-section-badge">Testimonials</span>
              <h2 className="lp-section-title">Loved by Real Estate Professionals</h2>
            </div>
            <div className="lp-testimonials-slider">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`lp-testimonial-slide ${index === activeTestimonial ? 'active' : ''}`}
                >
                  <Testimonial {...testimonial} />
                </div>
              ))}
            </div>
            <div className="lp-testimonials-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`lp-testimonial-dot ${index === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="lp-pricing">
          <div className="lp-pricing-container">
            <div className="lp-pricing-header">
              <span className="lp-section-badge">Pricing</span>
              <h2 className="lp-section-title">Simple, Transparent Pricing</h2>
              <p className="lp-section-subtitle">Choose the plan that fits your business. No hidden fees.</p>
            </div>
            <div className="lp-pricing-grid">
              <PricingCard
                title="Starter"
                price="0"
                period="month"
                features={[
                  "Up to 5 active listings",
                  "Basic document management",
                  "Make and receive offers",
                  "E-signature integration",
                ]}
                ctaText="Start Free"
              />
              <PricingCard
                title="Professional"
                price="19"
                period="month"
                features={[
                  "Unlimited listings",
                  "Detailed activity tracking", 
                  "Comps and valuations",
                  "AI disclosure analysis",
                ]}
                highlighted={true}
                ctaText="Get Started"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="lp-cta">
          <div className="lp-cta-content">
            <h2 className="lp-cta-title">Ready to Transform Your Business?</h2>
            <p className="lp-cta-subtitle">
              Join thousands of successful agents closing more deals with RealOffer
            </p>
            <div className="lp-cta-buttons">
              <Link to="/signup" className="lp-cta-button-primary">
                Get Started For Free
                <ArrowRight className="lp-cta-button-icon" />
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