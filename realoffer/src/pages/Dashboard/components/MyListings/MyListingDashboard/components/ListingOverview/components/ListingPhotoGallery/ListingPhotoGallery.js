import React, { useState } from 'react';
import './ListingPhotoGallery.css';

const ListingPhotoGallery = ({ images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  return (
    <div className="photo-gallery-modal">
      <div className="photo-gallery-content">
        <div className="photo-gallery-header">
          <button className="photo-gallery-close-button" onClick={onClose}></button>
        </div>
        <div className="photo-container">
          <button className="nav-button prev" onClick={handlePrev}>&#8249;</button>
          <img src={images[currentIndex]} alt={`Photo ${currentIndex + 1}`} className="main-photo" />
          <button className="nav-button next" onClick={handleNext}>&#8250;</button>
        </div>
        <div className="thumbnail-bar">
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Thumbnail ${index + 1}`}
              className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListingPhotoGallery;
