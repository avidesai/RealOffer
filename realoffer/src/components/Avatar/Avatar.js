import React from 'react';
import './Avatar.css';

const Avatar = ({ 
  src, 
  alt, 
  firstName, 
  lastName, 
  size = 'medium',
  className = ''
}) => {
  const getInitials = () => {
    if (!firstName && !lastName) return '?';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  };

  const getBackgroundColor = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];
    const name = (firstName + lastName).toLowerCase();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (src && src.trim() !== '' && src !== 'https://realoffer-bucket.s3.us-east-2.amazonaws.com/avatar.svg') {
    return (
      <img 
        src={src} 
        alt={alt || 'User Avatar'} 
        className={`avatar avatar-${size} ${className}`}
      />
    );
  }

  return (
    <div 
      className={`avatar avatar-${size} avatar-initials ${className}`}
      style={{ backgroundColor: getBackgroundColor() }}
      title={alt || `${firstName} ${lastName}`}
    >
      {getInitials()}
    </div>
  );
};

export default Avatar; 