// Features.js

import React, { useState } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import FeatureContent from './FeatureContent'; // Component to create for the content area
import './FeaturesPage.css';
import manageOffers from './manage-offers.png'
import formFilling from './form-filling.png'
import listingInformation from './listing-information.png';
import buyerActivity from './buyer-activity.png';

const featureData = [
  {
    id: 'manage-offers',
    image: manageOffers,
    buttonText: 'Offer Management',
    title1: 'Streamlined Offer Management',
    text1: 'Experience a modern approach to managing real estate offers. Our intuitive dashboard automatically organizes and compares offers side-by-side, making it easy to evaluate terms and conditions. Share this comprehensive view with your sellers to facilitate informed decision-making.',
    title2: 'Seamless Closing Experience',
    text2: 'Transform the closing process with our integrated platform. Access all closing documents in one secure location, with automated notifications keeping everyone on track. Our industry-leading security ensures your clients enjoy a smooth, professional closing experience every time.'
  },
  {
    id: 'form-filling',
    image: formFilling,
    buttonText: 'Document Management',
    title1: 'Advanced Document Tools',
    text1: 'Powerful PDF manipulation tools at your fingertips. Split documents, reorder pages, and redact sensitive information without leaving the platform. Create and share private or public Listing Information Packages with interested buyers, all while maintaining complete control over access.',
    title2: 'Smart Disclosure Management',
    text2: 'Simplify the disclosure process with our intelligent form-filling system. Guide sellers through disclosure documents step-by-step, preventing common mistakes and reducing liability. Save time while ensuring accuracy and compliance with all requirements.'
  },
  {
    id: 'listing-information',
    image: listingInformation,
    buttonText: 'Listing Packages',
    title1: 'Digital Listing Packages',
    text1: 'Create professional digital Listing Information Packages that go beyond what buyers see on traditional real estate portals. Share comprehensive property information securely, with complete control over access and visibility. Your listing information stays protected and never appears in public search results.',
    title2: 'Team Collaboration',
    text2: 'Built for modern real estate teams. Enable seamless collaboration between Transaction Coordinators, Assistants, Realtors, and Brokers. Manage, store, and monitor document activity in one secure location, ensuring everyone stays informed and aligned.'
  },
  {
    id: 'buyer-activity',
    image: buyerActivity,
    buttonText: 'Buyer Analytics',
    title1: 'Real-Time Buyer Insights',
    text1: 'Gain valuable insights into buyer interest with our advanced analytics. Track document views, reading time, and engagement levels for each buyer. Share detailed Buyer Interest Reports with sellers to demonstrate property demand and guide pricing decisions.',
    title2: 'Smart Notifications',
    text2: 'Stay ahead of the competition with instant notifications. Receive real-time updates on buyer activity through email, text, and our iOS app. Monitor the complete timeline of property interest and focus your attention on the most engaged buyers.'
  },
  // Add other feature data objects here
];

function FeaturesPage() {
  const [activeFeature, setActiveFeature] = useState(featureData[0].id);

  return (
    <div className="features-page-container">
      <Header />
      <div className="features-page-content">
        <h2 className="features-page-title">Powerful Features for Modern Real Estate</h2>
        <div className="features-page-menu">
          {featureData.map((feature) => (
            <button
              key={feature.id}
              className={`features-page-menu-item ${activeFeature === feature.id ? 'active' : ''}`}
              onClick={() => setActiveFeature(feature.id)}
            >
              {feature.buttonText}
            </button>
          ))}
        </div>
        <FeatureContent feature={featureData.find(f => f.id === activeFeature)} />
      </div>
      <Footer />
    </div>
  );
}

export default FeaturesPage;