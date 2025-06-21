// FeatureContent.js

import React from 'react';
import './FeatureContent.css';

function FeatureContent({ feature }) {
  if (!feature) {
    return null;
  }

  return (
    <div className="features-page-feature-content" key={feature.id}>
      <div className="features-page-feature-text">
        <h2 className="feature-title">{feature.title}</h2>
        <p className="feature-description">{feature.description}</p>
        <ul className="feature-points">
          {feature.points.map((point, index) => (
            <li key={index} className="feature-point">
              <span className="feature-point-icon">{point.icon}</span>
              <span className="feature-point-text">{point.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="features-page-feature-image-wrapper">
        <img 
          src={feature.image} 
          alt={feature.title} 
          className="features-page-feature-image"
        />
      </div>
    </div>
  );
}

export default FeatureContent;
