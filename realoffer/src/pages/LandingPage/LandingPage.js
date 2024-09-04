import React, { useState, useEffect } from 'react';
import { ChevronRight, Home, FileText, Calendar, BarChart2, MessageCircle, DollarSign, Users, Database, FileSignature, PenTool } from 'lucide-react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import VisibilitySensor from 'react-visibility-sensor';
import './LandingPage.css';

const Feature = ({ icon: Icon, title, description }) => (
  <div className="feature">
    <Icon className="feature-icon" />
    <h3 className="feature-title">{title}</h3>
    <p className="feature-description">{description}</p>
  </div>
);

const Stat = ({ icon: Icon, value, description }) => (
  <VisibilitySensor partialVisibility offset={{ bottom: 200 }}>
    {({ isVisible }) => (
      <div className="stat">
        <Icon className="stat-icon" />
        <CountUp start={0} end={isVisible ? value : 0} duration={2.75} redraw={true}>
          {({ countUpRef }) => <span ref={countUpRef} className="stat-value" />}
        </CountUp>
        <p className="stat-description">{description}</p>
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
            <h2 className="hero-title">Streamline Your Real Estate Transactions</h2>
            <p className="hero-subtitle">Powerful tools for listing agents and buyer's agents</p>
            <Link to="/signup" className="cta-button">
              Get Started <ChevronRight className="cta-icon" />
            </Link>
          </div>
        </section>

        <section className="features">
          <h2 className="lp-section-title">Key Features</h2>
          <div className="features-grid">
            <Feature
              icon={FileText}
              title="Document Management"
              description="Store and share essential disclosure documents with just a few clicks."
            />
            <Feature
              icon={Calendar}
              title="Automated Offer Preparation"
              description="Generate offer documents and submit offers in minutes with our intuitive platform."
            />
            <Feature
              icon={BarChart2}
              title="Real-Time Insights"
              description="Track buyer activity and listing performance with detailed analytics."
            />
            <Feature
              icon={DollarSign}
              title="Offer Management"
              description="Compare offers and simplify negotiations with a centralized dashboard for all offers."
            />
            <Feature
              icon={FileSignature}
              title="Create Signature Packets"
              description="Auto split and merge disclosure pages to create packets for buyers to sign during offers."
            />
            <Feature
              icon={PenTool}
              title="Integrated Document Signing"
              description="Send disclosures and offer documents to parties for signing with DocuSign integration."
            />
            <Feature
              icon={MessageCircle}
              title="Instant Messaging"
              description="Communicate seamlessly with buyers, sellers, and agents through our secure platform."
            />
            <Feature
              icon={Home}
              title="Schedule Showings"
              description="Manage property showings with online scheduling and reminders."
            />
          </div>
        </section>

        <section className="stats">
          <div className="stats-container">
            <Stat
              icon={Database}
              value={2232}
              description="Offers Received"
            />
            <Stat
              icon={Home}
              value={423}
              description="Homes Sold"
            />
            <Stat
              icon={Users}
              value={3495}
              description="Active Agents"
            />
          </div>
        </section>

        <section className="cta">
          <h2 className="cta-title">Ready to Transform Your Real Estate Business?</h2>
          <p className="cta-subtitle">Join thousands of successful agents using RealOffer</p>
          <Link to="/signup" className="cta-button">
              Sign Up For Free
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;