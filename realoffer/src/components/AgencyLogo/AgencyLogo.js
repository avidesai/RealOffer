import React from 'react';
import './AgencyLogo.css';

const AgencyLogo = ({ 
  src, 
  alt, 
  size = 'medium',
  className = '',
  fit = 'contain'
}) => {
  if (!src || src.trim() === '') {
    return (
      <div className={`agency-logo-placeholder agency-logo-${size} ${className}`}>
        <span className="placeholder-text">Logo</span>
      </div>
    );
  }

  return (
    <div className={`agency-logo-container agency-logo-${size} ${className}`}>
      <img 
        src={src} 
        alt={alt || 'Agency Logo'} 
        className="agency-logo-image"
        style={{ objectFit: fit }}
      />
    </div>
  );
};

export default AgencyLogo; 