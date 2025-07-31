// FeatureContent.js

import React from 'react';
import './FeatureContent.css';

function FeatureContent({ feature }) {
  if (!feature) {
    return null;
  }

  return (
    <div className="features-page-feature-content" key={feature.id}>
      <div className="features-page-feature-header">
        <h2 className="feature-title">{feature.title}</h2>
        <p className="feature-description">{feature.description}</p>
      </div>
      
      <div className="features-page-feature-body">
        <div className="feature-points-section">
          <h3 className="feature-points-title">How it works:</h3>
          <ul className="feature-points">
            {feature.points.map((point, index) => (
              <li key={index} className="feature-point">
                <span className="feature-point-icon">{point.icon}</span>
                <span className="feature-point-text">{point.text}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="feature-outcome">
          <div className="feature-outcome-header">
            <h3 className="feature-outcome-title">The Result</h3>
          </div>
          <p className="feature-outcome-text">{feature.outcome}</p>
        </div>
      </div>
    </div>
  );
}

export default FeatureContent;
