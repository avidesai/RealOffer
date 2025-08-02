// SimplifiedActivityView.js

import React from 'react';
import './SimplifiedActivityView.css';

const SimplifiedActivityView = ({ metrics }) => {
  const calculatePopularityTier = (metrics) => {
    const { views, downloads, buyerPackages } = metrics;
    
    // Tier 5 for high activity
    if (views >= 750 || buyerPackages >= 30 || downloads >= 3) return 5;
    
    // Tier 4 for very popular
    if (views >= 300 || buyerPackages >= 20 || downloads >= 1) return 4;
    
    // Tier 3 for popular
    if (views >= 100 || buyerPackages >= 10) return 3;
    
    // Tier 2 for getting attention
    if (views >= 25) return 2;
    
    // Tier 1 for normal activity
    return 1;
  };

  const getPopularityMessage = (tier, metrics) => {
    const { views, downloads, buyerPackages } = metrics;
    
    switch (tier) {
      case 1:
        return {
          title: "This home has normal activity",
          description: "This property is receiving typical interest from buyers in the area.",
          icon: "normal"
        };
      case 2:
        return {
          title: "This home is getting attention",
          description: "Buyers are showing interest in this property.",
          icon: "attention"
        };
      case 3:
        if (views >= 100) {
          return {
            title: "This home is popular",
            description: `Over ${Math.floor(views / 100) * 100} people have viewed this property.`,
            icon: "popular"
          };
        } else if (buyerPackages > 0) {
          const buyerPartyText = buyerPackages < 10 ? 'Several' : `Over ${Math.floor(buyerPackages / 10) * 10}`;
          return {
            title: "This home is popular",
            description: `${buyerPartyText} buyer parties are interested in this property.`,
            icon: "popular"
          };
        } else {
          return {
            title: "This home is popular",
            description: "This property is generating good interest from buyers.",
            icon: "popular"
          };
        }
      case 4:
        if (views >= 300) {
          return {
            title: "This home is very popular",
            description: `Over ${Math.floor(views / 100) * 100} people have viewed this property. Make an offer before it's gone!`,
            icon: "very-popular"
          };
        } else if (buyerPackages >= 3) {
          const buyerPartyText = buyerPackages < 10 ? 'Several' : `Over ${Math.floor(buyerPackages / 10) * 10}`;
          return {
            title: "This home is very popular",
            description: `${buyerPartyText} buyer parties are interested in this property. Make an offer before it's gone!`,
            icon: "very-popular"
          };
        } else if (downloads > 0) {
          return {
            title: "This home is very popular",
            description: `Buyers are actively downloading documents for this property. Make an offer before it's gone!`,
            icon: "very-popular"
          };
        } else {
          return {
            title: "This home is very popular",
            description: "This property is generating strong buyer interest. Make an offer before it's gone!",
            icon: "very-popular"
          };
        }
      case 5:
        if (views >= 750) {
          return {
            title: "This home is a hot property",
            description: `Over ${Math.floor(views / 100) * 100} people have viewed this property. Make an offer before it's gone!`,
            icon: "hot"
          };
        } else if (buyerPackages >= 5) {
          const buyerPartyText = buyerPackages < 10 ? 'Several' : `Over ${Math.floor(buyerPackages / 10) * 10}`;
          return {
            title: "This home is a hot property",
            description: `${buyerPartyText} buyer parties are interested in this property. Make an offer before it's gone!`,
            icon: "hot"
          };
        } else if (downloads >= 3) {
          return {
            title: "This home is a hot property",
            description: "Buyers are actively downloading documents for this property. Make an offer before it's gone!",
            icon: "hot"
          };
        } else {
          return {
            title: "This home is a hot property",
            description: "This property is generating exceptional buyer interest. Make an offer before it's gone!",
            icon: "hot"
          };
        }
      default:
        return {
          title: "This home has normal activity",
          description: "This property is receiving typical interest from buyers in the area.",
          icon: "normal"
        };
    }
  };

  const getActivityIcon = (iconType) => {
    switch (iconType) {
      case "normal":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "attention":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "popular":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" opacity="0.3"/>
          </svg>
        );
      case "very-popular":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" opacity="0.5"/>
          </svg>
        );
      case "hot":
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" opacity="0.7"/>
          </svg>
        );
      default:
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  const tier = calculatePopularityTier(metrics);
  const popularityData = getPopularityMessage(tier, metrics);


  return (
    <div className="sav-simplified-activity-view">
      <div className="sav-popularity-card" data-tier={tier}>
        <div className="sav-popularity-icon">
          {getActivityIcon(popularityData.icon)}
        </div>
        <div className="sav-popularity-content">
          <h2 className="sav-popularity-title">{popularityData.title}</h2>
          <p className="sav-popularity-description">{popularityData.description}</p>
        </div>
      </div>
      
      {/* Chart section hidden for now - can be re-enabled later */}
      {/* 
      <div className="sav-views-chart">
        <h3 className="sav-chart-title">Activity Since Listing Created</h3>
        <div className="sav-chart-container">
          <svg className="sav-line-chart" viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sav-line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#007bff" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#007bff" stopOpacity="0.1"/>
              </linearGradient>
            </defs>
            <path
              className="sav-line-path"
              d={activitiesPerDay.map((activities, index) => {
                const x = (index / (activitiesPerDay.length - 1)) * 100;
                const y = 40 - (maxActivities > 0 ? (activities / maxActivities) * 35 : 0);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="#007bff"
              strokeWidth="1.5"
            />
            <path
              className="sav-area-path"
              d={`M 0 40 ${activitiesPerDay.map((activities, index) => {
                const x = (index / (activitiesPerDay.length - 1)) * 100;
                const y = 40 - (maxActivities > 0 ? (activities / maxActivities) * 35 : 0);
                return `L ${x} ${y}`;
              }).join(' ')} L 100 40 Z`}
              fill="url(#sav-line-gradient)"
            />
          </svg>
        </div>
      </div>
      */}
      
      <div className="sav-activity-info">
        <div className="sav-info-section">
          <h3>Activity Information</h3>
          <p>Detailed activity information is not available for this listing. The listing agent has chosen to keep this information private.</p>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedActivityView; 