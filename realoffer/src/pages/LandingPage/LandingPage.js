// LandingPage.js

import React, { useState, useEffect } from 'react';
import { ChevronRight, Home, FileText, Calendar, BarChart2, MessageCircle, DollarSign, Users, Inbox, FileSignature, PenTool, Zap, Shield, Clock, TrendingUp, Award, Smartphone, Globe, Search, Calculator, Check, Star, ArrowRight, Play, Lock, CheckCircle, XCircle, Sparkles, Building2, Briefcase, HeartHandshake, Menu, X, Trophy } from 'lucide-react';
import Footer from '../../components/Footer/Footer';
import { Link, useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import VisibilitySensor from 'react-visibility-sensor';
import logo from './images/logo.png';
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
    const hero = document.querySelector('.hero');
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
    <header className={`landing-header ${isScrolled ? 'landing-header-scrolled' : ''}`}>
      <div className="landing-header-container">
        <Link to="/" className="landing-header-logo">
          <img src={logo} alt="RealOffer" className="landing-header-logo-image" />
          <span className="landing-header-logo-text">RealOffer</span>
        </Link>

        <nav className={`landing-header-nav ${isMobileMenuOpen ? 'landing-header-nav-open' : ''}`}>
          <Link to="/features" className="landing-header-nav-link">Features</Link>
          <Link to="/upgrade" className="landing-header-nav-link">Pricing</Link>
          <Link to="/about" className="landing-header-nav-link">About</Link>

          <div className="landing-header-mobile-actions">
            <Link to="/login" className="landing-header-login" onClick={handleLoginClick}>
              {user ? 'Dashboard' : 'Log In'}
            </Link>
            {user ? (
              <button className="landing-header-signup" onClick={handleLogoutClick}>
                Log Out
              </button>
            ) : (
              <Link to="/signup" className="landing-header-signup">
                Get Started
              </Link>
            )}
          </div>
        </nav>

        <div className="landing-header-actions">
          <Link to="/login" className="landing-header-login" onClick={handleLoginClick}>
            {user ? 'Dashboard' : 'Log In'}
          </Link>
          {user ? (
            <button className="landing-header-signup" onClick={handleLogoutClick}>
              Log Out
            </button>
          ) : (
            <Link to="/signup" className="landing-header-signup">
              Get Started
            </Link>
          )}
        </div>

        <button 
          className="landing-header-mobile-toggle"
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
  <div className={`feature ${highlight ? 'feature-highlight' : ''}`}>
    <div className="feature-icon-wrapper">
      <Icon className="feature-icon" />
    </div>
    <h3 className="feature-title">{title}</h3>
    <p className="feature-description">{description}</p>
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
          <div className="landing-stat">
            <div className="landing-stat-icon-wrapper">
              <Icon className="landing-stat-icon" />
            </div>
            <div className="landing-stat-value-wrapper">
              <CountUp 
                start={0} 
                end={hasAnimated ? value : 0} 
                duration={2.75} 
                redraw={false}
                useEasing={true}
              >
                {({ countUpRef }) => <span ref={countUpRef} className="landing-stat-value" />}
              </CountUp>
              {suffix && <span className="landing-stat-suffix">{suffix}</span>}
            </div>
            <p className="landing-stat-description">{description}</p>
          </div>
        );
      }}
    </VisibilitySensor>
  );
};

const Testimonial = ({ quote, author, role, company, rating }) => (
  <div className="testimonial">
    <div className="testimonial-rating">
      {[...Array(rating)].map((_, i) => (
        <Star key={i} className="testimonial-star" fill="currentColor" />
      ))}
    </div>
    <p className="testimonial-quote">"{quote}"</p>
    <div className="testimonial-author">
      <div className="testimonial-author-info">
        <p className="testimonial-author-name">{author}</p>
        <p className="testimonial-author-role">{role}, {company}</p>
      </div>
    </div>
  </div>
);

const PricingCard = ({ title, price, period, features, highlighted, ctaText }) => (
  <div className={`pricing-card ${highlighted ? 'pricing-card-highlighted' : ''}`}>
    {highlighted && <div className="pricing-badge">Most Popular</div>}
    <div className="pricing-header">
      <h3 className="pricing-title">{title}</h3>
      <div className="pricing-price">
        <span className="pricing-currency">$</span>
        <span className="pricing-amount">{price}</span>
        <span className="pricing-period">/{period}</span>
      </div>
    </div>
    <ul className="pricing-features">
      {features.map((feature, index) => (
        <li key={index} className="pricing-feature">
          <CheckCircle className="pricing-feature-icon" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <Link to="/signup" className={`pricing-cta ${highlighted ? 'pricing-cta-primary' : 'pricing-cta-secondary'}`}>
      {ctaText}
    </Link>
  </div>
);

const LandingPage = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="landing-page">
      <LandingHeader />
      <main className="landing-main">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-background">
            <div className="hero-gradient-orb hero-gradient-orb-1"></div>
            <div className="hero-gradient-orb hero-gradient-orb-2"></div>
            <div className="hero-grid-pattern"></div>
          </div>
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles className="hero-badge-icon" />
              <span>Trusted by 2,625+ Real Estate Professionals</span>
            </div>
            <h1 className="hero-title">
              Close More Deals with<br />
              <span className="hero-title-gradient">Intelligent Real Estate Tools</span>
            </h1>
            <p className="hero-subtitle">
              The all-in-one platform that streamlines listings, offers, and transactions. 
              Save time, reduce errors, and deliver exceptional client experiences.
            </p>
            <div className="hero-cta-group">
              <Link to="/signup" className="hero-cta-primary">
                Get Started For Free
                <ArrowRight className="hero-cta-icon" />
              </Link>
              <button className="hero-cta-secondary">
                <Play className="hero-play-icon" />
                Watch Demo
              </button>
            </div>
            <div className="hero-trust-badges">
              <div className="hero-trust-badge">
                <DollarSign className="hero-trust-icon" />
                <span>Win More Listings</span>
              </div>
              <div className="hero-trust-badge">
                <Clock className="hero-trust-icon" />
                <span>Save Hours Per Deal</span>
              </div>
              <div className="hero-trust-badge">
                <Trophy className="hero-trust-icon" />
                <span>Beat Other Offers</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-dashboard-preview">
              <div className="hero-dashboard-window">
                <div className="hero-dashboard-header">
                  <div className="hero-dashboard-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className="hero-dashboard-content">
                  {/* Placeholder for dashboard preview */}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="trust-bar">
          <div className="trust-bar-content">
            <p className="trust-bar-text">Trusted by leading brokerages</p>
            <div className="trust-bar-logos">
              <div className="trust-logo">Keller Williams</div>
              <div className="trust-logo">RE/MAX</div>
              <div className="trust-logo">Compass</div>
              <div className="trust-logo">Coldwell Banker</div>
              <div className="trust-logo">Century 21</div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features">
          <div className="features-header">
            <span className="section-badge">Features</span>
            <h2 className="section-title">Everything You Need to Succeed</h2>
            <p className="section-subtitle">
              Powerful tools designed by agents, for agents. Streamline every aspect of your real estate business.
            </p>
          </div>
          <div className="features-grid">
            <Feature
              icon={FileText}
              title="Smart Document Hub"
              description="AI-powered document analysis identifies key terms, dates, and potential issues instantly."
            />
            <Feature
              icon={Zap}
              title="Lightning-Fast Offers"
              description="Create and submit professional offers in under 5 minutes with auto-filled forms."
            />
            <Feature
              icon={Shield}
              title="Secure E-Signatures"
              description="DocuSign integration with audit trails and automatic filing for complete compliance."
            />
            <Feature
              icon={BarChart2}
              title="Real-Time Analytics"
              description="Track document views, offer activity, and buyer engagement with actionable insights."
            />
            <Feature
              icon={Calculator}
              title="Market Intelligence"
              description="Access property valuations, comps, and market trends to price competitively."
            />
            <Feature
              icon={MessageCircle}
              title="Unified Communications"
              description="Keep all parties connected with in-platform messaging and notifications."
            />
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works">
          <div className="how-it-works-content">
            <div className="how-it-works-header">
              <span className="section-badge">Process</span>
              <h2 className="section-title">Close Deals in 3 Simple Steps</h2>
            </div>
            <div className="how-it-works-steps">
              <div className="how-step">
                <div className="how-step-number">1</div>
                <div className="how-step-content">
                  <h3>Create Your Listing</h3>
                  <p>Upload documents, add property details, and publish your listing in minutes.</p>
                </div>
              </div>
              <div className="how-step-connector"></div>
              <div className="how-step">
                <div className="how-step-number">2</div>
                <div className="how-step-content">
                  <h3>Manage Offers</h3>
                  <p>Receive, review, and respond to offers through our intuitive dashboard.</p>
                </div>
              </div>
              <div className="how-step-connector"></div>
              <div className="how-step">
                <div className="how-step-number">3</div>
                <div className="how-step-content">
                  <h3>Close with Confidence</h3>
                  <p>E-sign documents, track progress, and close deals faster than ever.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="benefits">
          <div className="benefits-container">
            <div className="benefits-header">
              <span className="section-badge">Benefits</span>
              <h2 className="section-title">Why Top Agents Choose RealOffer</h2>
            </div>
            <div className="benefits-grid">
              <div className="benefit-card">
                <div className="benefit-icon-wrapper">
                  <TrendingUp className="benefit-icon" />
                </div>
                <h3>40% Faster Transactions</h3>
                <p>Streamlined workflows and automation reduce closing times significantly.</p>
                <Link to="/features" className="benefit-link">
                  Learn how <ArrowRight className="benefit-link-icon" />
                </Link>
              </div>
              <div className="benefit-card">
                <div className="benefit-icon-wrapper">
                  <Users className="benefit-icon" />
                </div>
                <h3>5-Star Client Experience</h3>
                <p>Professional tools that impress clients and build lasting relationships.</p>
                <Link to="/features" className="benefit-link">
                  See features <ArrowRight className="benefit-link-icon" />
                </Link>
              </div>
              <div className="benefit-card">
                <div className="benefit-icon-wrapper">
                  <DollarSign className="benefit-icon" />
                </div>
                <h3>2x More Deals</h3>
                <p>Handle multiple transactions simultaneously without dropping the ball.</p>
                <Link to="/features" className="benefit-link">
                  Get started <ArrowRight className="benefit-link-icon" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="landing-stats">
          <div className="landing-stats-container">
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
        <section className="testimonials">
          <div className="testimonials-container">
            <div className="testimonials-header">
              <span className="section-badge">Testimonials</span>
              <h2 className="section-title">Loved by Real Estate Professionals</h2>
            </div>
            <div className="testimonials-slider">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`testimonial-slide ${index === activeTestimonial ? 'active' : ''}`}
                >
                  <Testimonial {...testimonial} />
                </div>
              ))}
            </div>
            <div className="testimonials-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`testimonial-dot ${index === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing">
          <div className="pricing-container">
            <div className="pricing-header">
              <span className="section-badge">Pricing</span>
              <h2 className="section-title">Simple, Transparent Pricing</h2>
              <p className="section-subtitle">Choose the plan that fits your business. No hidden fees.</p>
            </div>
            <div className="pricing-grid">
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
                  "Auto-fill offer documents",
                  "Comps and valuations",
                  "AI disclosure analysis",
                ]}
                highlighted={true}
                ctaText="Start Free Trial"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Business?</h2>
            <p className="cta-subtitle">
              Join thousands of successful agents closing more deals with RealOffer
            </p>
            <div className="cta-buttons">
              <Link to="/signup" className="hero-cta-primary">
                Get Started For Free
                <ArrowRight className="hero-cta-icon" />
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