// FeaturesPage.js

import React, { useState } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import FeatureContent from './FeatureContent';
import './FeaturesPage.css';
import { FileText, Zap, BarChart2, Shield, Eye, Users, Search, MessageCircle } from 'lucide-react';

// Import images
import manageOffers from './manage-offers.png';
import formFilling from './form-filling.png';
import listingInformation from './listing-information.png';
import buyerActivity from './buyer-activity.png';

const featuresData = [
  {
    category: 'For Listing Agents',
    id: 'for-listing-agents',
    features: [
      {
        id: 'smart-documentation',
        buttonText: 'Smart Documentation',
        title: 'AI-Powered Document Management',
        image: formFilling,
        description: 'Streamline your entire document workflow from creation to closing with our intelligent tools.',
        points: [
          { icon: <FileText size={20} />, text: 'Centralize all listing documents in one secure, cloud-based hub.' },
          { icon: <Zap size={20} />, text: 'Utilize AI to analyze disclosures, identifying key terms and potential risks instantly.' },
          { icon: <Shield size={20} />, text: 'Create and share secure Listing Information Packages with tracked viewership.' },
        ],
      },
      {
        id: 'offer-management',
        buttonText: 'Offer Management',
        title: 'Effortless Offer Review & Response',
        image: manageOffers,
        description: 'Receive and manage offers through a centralized, shareable dashboard.',
        points: [
          { icon: <BarChart2 size={20} />, text: 'Automatically organize and compare all offers side-by-side.' },
          { icon: <Eye size={20} />, text: 'Share a beautiful offer comparison with your clients for transparent decision-making.' },
          { icon: <Users size={20} />, text: 'Respond to agents and manage counter-offers all in one place.' },
        ],
      },
      {
        id: 'buyer-analytics',
        buttonText: 'Buyer Analytics',
        title: 'Actionable Buyer Interest Reports',
        image: buyerActivity,
        description: 'Make data-driven decisions with real-time insights into buyer engagement.',
        points: [
          { icon: <Eye size={20} />, text: "Track who's viewing, downloading, and interacting with your listing documents." },
          { icon: <BarChart2 size={20} />, text: 'Identify the most interested buyers and focus your efforts effectively.' },
          { icon: <MessageCircle size={20} />, text: 'Receive instant notifications for key activities on your listings.' },
        ],
      },
    ],
  },
  {
    category: "For Buyer's Agents",
    id: 'for-buyers-agents',
    features: [
      {
        id: 'instant-access',
        buttonText: 'Instant Access',
        title: '24/7 Access to Listing Packages',
        image: listingInformation,
        description: "Never wait for a listing agent again. Get instant, on-demand access to all the documents you need.",
        points: [
          { icon: <FileText size={20} />, text: 'Access complete and organized disclosure packages anytime, anywhere.' },
          { icon: <Zap size={20} />, text: 'Download all documents with a single click.' },
          { icon: <Search size={20} />, text: 'Easily search within documents to find the information you need fast.' },
        ],
      },
      {
        id: 'fast-offers',
        buttonText: 'Lightning-Fast Offers',
        title: 'Create & Submit Winning Offers',
        image: formFilling, // Re-using image, can be replaced
        description: 'Gain a competitive edge by submitting professional, complete offers in minutes.',
        points: [
          { icon: <Zap size={20} />, text: 'Auto-fill standard forms with property and buyer information.' },
          { icon: <FileText size={20} />, text: 'Easily attach all necessary documents from the Listing Information Package.' },
          { icon: <MessageCircle size={20} />, text: 'Submit and track your offer through a secure, professional platform.' },
        ],
      },
    ],
  },
];

function FeaturesPage() {
  // Flatten the features for easy lookup, and set the first feature as default
  const allFeatures = featuresData.flatMap(category => category.features);
  const [activeFeature, setActiveFeature] = useState(allFeatures[0]);

  return (
    <div className="features-page-container">
      <Header />
      <main className="features-page-main">
        <div className="features-page-hero">
          <h1 className="features-page-hero-title">Powerful Tools for Modern Agents</h1>
          <p className="features-page-hero-subtitle">
            RealOffer is designed to streamline every step of your real estate transactions, saving you time and helping you close more deals.
          </p>
        </div>
        <div className="features-page-content">
          <aside className="features-page-sidebar">
            {featuresData.map((category) => (
              <div key={category.id} className="features-category">
                <h3 className="features-category-title">{category.category}</h3>
                {category.features.map((feature) => (
                  <button
                    key={feature.id}
                    className={`features-page-menu-item ${activeFeature.id === feature.id ? 'active' : ''}`}
                    onClick={() => setActiveFeature(feature)}
                  >
                    {feature.buttonText}
                  </button>
                ))}
              </div>
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