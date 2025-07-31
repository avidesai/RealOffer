// FeaturesPage.js

import React, { useState } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import FeatureContent from './FeatureContent';
import './FeaturesPage.css';
import { FileText, Zap, BarChart2, Shield, Eye, Users, Search, MessageCircle, DollarSign, Clock, TrendingUp, CheckCircle } from 'lucide-react';

const featuresData = [
  {
    id: 'centralized-disclosures',
    buttonText: 'Centralized Disclosures',
    title: 'Upload Once, Buyers Access Everything',
    description: 'Eliminate the back-and-forth of document requests. Upload all disclosures once and buyer agents get instant access to everything they need.',
    points: [
      { icon: <FileText size={20} />, text: 'Upload all disclosure documents in one organized hub' },
      { icon: <Zap size={20} />, text: 'Buyer agents access everything instantly - no more waiting' },
      { icon: <Shield size={20} />, text: 'Create signature packets to speed up offer preparation' },
    ],
    outcome: 'Get more offers because buyers can analyze your property immediately'
  },
  {
    id: 'ai-summaries',
    buttonText: 'AI Report Summaries',
    title: 'Turn Complex Reports Into Clear Insights',
    description: 'AI automatically summarizes dense inspection reports into buyer-friendly overviews that increase confidence and speed up decisions.',
    points: [
      { icon: <Zap size={20} />, text: 'AI analyzes inspection reports and highlights key findings' },
      { icon: <Eye size={20} />, text: 'Buyers understand your property faster with clear summaries' },
      { icon: <TrendingUp size={20} />, text: 'Reduce buyer questions and increase offer confidence' },
    ],
    outcome: 'Faster buyer analysis leads to more offers per listing'
  },
  {
    id: 'smart-valuations',
    buttonText: 'Smart Valuations',
    title: 'Instant Comps & Market Intelligence',
    description: 'Provide buyer agents with suggested price ranges and comparable analysis so they can assess your property\'s value instantly.',
    points: [
      { icon: <BarChart2 size={20} />, text: 'AI-powered comparable analysis and market insights' },
      { icon: <DollarSign size={20} />, text: 'Instant property valuations with detailed breakdowns' },
      { icon: <Clock size={20} />, text: 'Buyers make faster decisions with clear value context' },
    ],
    outcome: 'Help buyers understand value quickly, leading to faster offers'
  },
  {
    id: 'activity-tracking',
    buttonText: 'Activity Tracking',
    title: 'See Every Buyer Touchpoint',
    description: 'Track how many buyer agents view your listing, download disclosures, or submit offers. Create urgency and keep sellers informed.',
    points: [
      { icon: <Eye size={20} />, text: 'Real-time tracking of buyer agent engagement with your listing' },
      { icon: <Users size={20} />, text: 'Show sellers exactly how much interest their property is generating' },
      { icon: <MessageCircle size={20} />, text: 'Identify the most interested buyers and focus your efforts' },
    ],
    outcome: 'Build seller confidence and create urgency for serious buyers'
  },
  {
    id: 'offer-management',
    buttonText: 'Offer Management',
    title: 'Organize & Compare Every Offer',
    description: 'Receive, review, and respond to offers through a structured dashboard with easy comparison and response tools.',
    points: [
      { icon: <BarChart2 size={20} />, text: 'Side-by-side offer comparison with key metrics highlighted' },
      { icon: <CheckCircle size={20} />, text: 'Track offer status and respond to offers efficiently' },
      { icon: <Users size={20} />, text: 'Share professional offer summaries with your sellers' },
    ],
    outcome: 'Close more deals with better offer management and seller communication'
  },
  {
    id: 'communication-hub',
    buttonText: 'Communication Hub',
    title: 'Centralize All Conversations',
    description: 'Keep all conversations with buyer agents organized in one place. No more missed inquiries or lost threads.',
    points: [
      { icon: <MessageCircle size={20} />, text: 'All buyer agent communications in one organized thread' },
      { icon: <Search size={20} />, text: 'Quick search and filtering of past conversations' },
      { icon: <Shield size={20} />, text: 'Professional communication platform that builds trust' },
    ],
    outcome: 'Never miss an opportunity and maintain professional relationships'
  },
];

function FeaturesPage() {
  const [activeFeature, setActiveFeature] = useState(featuresData[0]);

  return (
    <div className="features-page-container">
      <Header />
      <main className="features-page-main">
        <div className="features-page-hero">
          <h1 className="features-page-hero-title">Your Secret Weapon for More Offers</h1>
          <p className="features-page-hero-subtitle">
            Every feature exists to streamline the buyer's journey and improve your outcomes. 
            We don't replace your listing process — we supercharge it.
          </p>
        </div>
        <div className="features-page-content">
          <aside className="features-page-sidebar">
            <h3 className="features-category-title">Features</h3>
            {featuresData.map((feature) => (
              <button
                key={feature.id}
                className={`features-page-menu-item ${activeFeature.id === feature.id ? 'active' : ''}`}
                onClick={() => setActiveFeature(feature)}
              >
                {feature.buttonText}
              </button>
            ))}
          </aside>
          <section className="features-page-feature-display">
            <FeatureContent feature={activeFeature} />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default FeaturesPage;