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
    buttonText: 'Manage Offers & Closing Services',
    title1: 'Send, Receive, Respond and Manage Offers',
    text1: 'Receive all of your offers in one secure, online location. RealOffer will automatically organize every offer into a beautiful dashboard (pictured left) that compares the terms side-by-side. This dashboard is sharable with your seller.',
    title2: 'Give clients a great closing',
    text2: 'A modern escrow experience designed for top agents, their teams, and their clients. Enjoy a single and secure place where all closing documents are easily accessible, anytime. Our industry-leading security coupled with automated notifications keeps everyone on track so that you can give your client a great closing experience every time. '
  },
  {
    id: 'form-filling',
    image: formFilling,
    buttonText: 'Form Filling & Document Management',
    title1: 'Manage, Store, and View Activity on Documents',
    text1: 'Need to split a large document into smaller files, re-order pages, or redact private info? You have access to all of the powerful PDF manipulation tools you need without ever opening Adobe Acrobat. Create a privatemanage or public Listing Information Package and share it with interested buyer parties.',
    title2: 'Seller Disclosures & Form Filling',
    text2: 'Faster, Easier, & Safer Disclosures. Easy form filling for every disclosure doc you\'re already using. RealOffer makes it seamless and straightforward for your clients to complete seller disclosures. Prevent seller mistakes, limit agent liability, and save a ton of time! Best yet, it’s free to use. '
  },
  {
    id: 'listing-information',
    image: listingInformation,
    buttonText: 'Listing Information Packages',
    title1: 'Private/Public Listing Information Packages',
    text1: 'Create digital Listing Information Packages that are easy to share and track viewership activity. Either private or public, a “Listing Information Package” contains the supplemental documents that buyers won\'t find on real estate portals like Zillow. RealOffer keeps your listing-info-package secure. You\'ll decide who deserves access, and your packet will never end up on google.',
    title2: 'Listing Team Shared Access',
    text2: 'RealOffer is built for teams. Trusted by Transaction Coordinators, Assistants, Realtors, Brokers, & Brokerages, RealOffer makes it easy for you to invite your team to manage, store, and monitor viewer activity on listing documents - in one secure location.'
  },
  {
    id: 'buyer-activity',
    image: buyerActivity,
    buttonText: 'Detailed Buyer Interest Reports',
    title1: 'PDFs and email can\'t track viewership activity',
    text1: 'Email wasn\'t designed for large attachments, and it won\'t let you track the activity for each viewer. With RealOffer\'s Listing Information Packages, you and your team can view Buyer Interest Reports explaining the: open, read, and percentage of each document read by each buyer party. You can also share the Buyer Interest Reports with your seller.',
    title2: 'View a full timeline and get instant notifications',
    text2: 'You can view and download an entire timeline of viewership activity. Email, text, and iOS App notifications keep you up to date on your listing interest in real-time. Provide the proper attention to the most interested parties and start seeing offers coming well before they arrive.'
  },
  // Add other feature data objects here
];

function FeaturesPage() {
  const [activeFeature, setActiveFeature] = useState(featureData[0].id);

  return (
    <div className="features-page-container">
      <Header />
      <div className="features-page-content">
        <h2 className="features-page-title">Our Key Features</h2>
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