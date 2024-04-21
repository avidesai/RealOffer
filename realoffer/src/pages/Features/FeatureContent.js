// FeatureContent.js

import React from 'react';
import './FeatureContent.css';

function FeatureContent({ feature }) {
  return (
    <div className="features-page-feature-content">
      <div className="features-page-feature-image">
        <img src={feature.image} alt="" />
      </div>
      <div className="features-page-feature-text">
        <h3>{feature.title1}</h3>
        <p>{feature.text1}</p>
        <h3>{feature.title2}</h3>
        <p>{feature.text2}</p>
      </div>
    </div>
  );
}

export default FeatureContent;
