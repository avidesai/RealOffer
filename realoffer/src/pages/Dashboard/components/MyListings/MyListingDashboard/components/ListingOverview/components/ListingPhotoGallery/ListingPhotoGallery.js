// ListingPhotoGallery.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ListingPhotoGallery.css';

const ListingPhotoGallery = ({ images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const thumbnailBarRef = useRef(null);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  }, [images.length]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowLeft') {
      handlePrev();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    } else if (event.key === 'Escape') {
      onClose();
    }
  }, [handlePrev, handleNext, onClose]);

  useEffect(() => {
    if (images.length > 0) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [images.length, handleKeyDown]);

  useEffect(() => {
    if (thumbnailBarRef.current) {
      const activeThumb = thumbnailBarRef.current.querySelector('.thumbnail.active');
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  return (
    <div className="photo-gallery-modal" onClick={onClose}>
      <div className="photo-gallery-content" onClick={(e) => e.stopPropagation()}>
        <div className="photo-gallery-header">
          <button className="photo-gallery-close-button" onClick={onClose}></button>
        </div>
        <div className="photo-container">
          <button className="nav-button prev" onClick={handlePrev}>&#8249;</button>
          <img src={images[currentIndex]} alt={`Image ${currentIndex + 1}`} className="main-photo" />
          <button className="nav-button next" onClick={handleNext}>&#8250;</button>
        </div>
        <div className="thumbnail-bar-container">
          <div className="thumbnail-bar" ref={thumbnailBarRef}>
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
    </div>
  );
};

export default ListingPhotoGallery;
