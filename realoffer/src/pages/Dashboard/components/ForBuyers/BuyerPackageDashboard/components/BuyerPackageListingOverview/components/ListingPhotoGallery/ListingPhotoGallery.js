// ListingPhotoGallery.js

import React, { useState, useEffect } from 'react';
import './ListingPhotoGallery.css';

function ListingPhotoGallery({ images, onClose, listingId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        previousImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const nextImage = () => {
    if (images && images.length > 1) {
      setIsImageLoading(true);
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  };

  const previousImage = () => {
    if (images && images.length > 1) {
      setIsImageLoading(true);
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  };

  const goToImage = (index) => {
    setIsImageLoading(true);
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) {
    return (
      <div className="listing-photo-gallery-overlay" onClick={onClose}>
        <div className="listing-photo-gallery-modal" onClick={(e) => e.stopPropagation()}>
          <div className="listing-photo-gallery-header">
            <h2>Photo Gallery</h2>
            <button className="listing-photo-gallery-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="listing-photo-gallery-content">
            <p>No images available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="listing-photo-gallery-overlay" onClick={onClose}>
      <div className="listing-photo-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="listing-photo-gallery-header">
          <h2>Photo Gallery</h2>
          <button className="listing-photo-gallery-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="listing-photo-gallery-content">
          <div className="listing-photo-gallery-main">
            <button
              className="listing-photo-gallery-nav listing-photo-gallery-prev"
              onClick={previousImage}
              disabled={images.length <= 1}
            >
              ‹
            </button>

            <div className="listing-photo-gallery-image-container">
              <img
                src={images[currentIndex]}
                alt={`Property image ${currentIndex + 1}`}
                className={`listing-photo-gallery-image ${isImageLoading ? 'loading' : ''}`}
                onLoad={() => setIsImageLoading(false)}
              />
              {isImageLoading && (
                <div className="listing-photo-gallery-loading">
                  <div className="listing-photo-gallery-spinner"></div>
                </div>
              )}
            </div>

            <button
              className="listing-photo-gallery-nav listing-photo-gallery-next"
              onClick={nextImage}
              disabled={images.length <= 1}
            >
              ›
            </button>
          </div>

          <div className="listing-photo-gallery-info">
            <span className="listing-photo-gallery-counter">
              {currentIndex + 1} of {images.length}
            </span>
          </div>

          {images.length > 1 && (
            <div className="listing-photo-gallery-thumbnails">
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className={`listing-photo-gallery-thumbnail ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => goToImage(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListingPhotoGallery; 