// FeatureContent.js

import React, { useEffect, useState } from 'react';
import './FeatureContent.css';

function FeatureContent({ feature }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [feature]);

  if (!feature) return null;

  return (
    <div className="features-page-feature-content" style={{ opacity: isVisible ? 1 : 0 }}>
      <div className="features-page-feature-image">
        <img src={feature.image} alt={feature.title1} />
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
