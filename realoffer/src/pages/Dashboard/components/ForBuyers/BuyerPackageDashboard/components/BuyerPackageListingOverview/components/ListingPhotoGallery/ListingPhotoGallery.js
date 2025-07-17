// ListingPhotoGallery.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ListingPhotoGallery.css';

const ListingPhotoGallery = ({ images, onClose, listingId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [orderedImages, setOrderedImages] = useState(images);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const thumbnailBarRef = useRef(null);
  const mainPhotoRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  useEffect(() => {
    setOrderedImages(images);
  }, [images]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? orderedImages.length - 1 : prevIndex - 1));
  }, [orderedImages.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === orderedImages.length - 1 ? 0 : prevIndex + 1));
  }, [orderedImages.length]);

  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        handlePrev();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handleNext();
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      case 'Home':
        event.preventDefault();
        setCurrentIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setCurrentIndex(orderedImages.length - 1);
        break;
      default:
        break;
    }
  }, [handlePrev, handleNext, onClose, orderedImages.length]);

  // Touch handlers for swipe gestures
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  useEffect(() => {
    if (orderedImages.length > 0) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [orderedImages.length, handleKeyDown]);

  useEffect(() => {
    if (thumbnailBarRef.current) {
      const activeThumb = thumbnailBarRef.current.querySelector('.thumbnail.active');
      if (activeThumb) {
        activeThumb.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        });
      }
    }
  }, [currentIndex]);

  // Auto-hide navigation buttons after inactivity
  useEffect(() => {
    let timeout;
    const handleMouseMove = () => {
      const navButtons = document.querySelectorAll('.nav-button');
      navButtons.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0)';
      });
      
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        navButtons.forEach(btn => {
          btn.style.opacity = '0';
          btn.style.transform = 'translateY(10px)';
        });
      }, 3000);
    };

    const photoContainer = document.querySelector('.photo-container');
    if (photoContainer) {
      photoContainer.addEventListener('mousemove', handleMouseMove);
      return () => {
        photoContainer.removeEventListener('mousemove', handleMouseMove);
        clearTimeout(timeout);
      };
    }
  }, []);

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

  const handleMainPhotoClick = (e) => {
    // Prevent navigation when clicking on the main photo
    e.stopPropagation();
  };

  return (
    <div className="photo-gallery-modal" onClick={onClose}>
      <div className="photo-gallery-content" onClick={(e) => e.stopPropagation()}>
        <div className="photo-gallery-header">
          <button 
            className="photo-gallery-close-button" 
            onClick={onClose}
            aria-label="Close gallery"
          ></button>
        </div>
        
        <div 
          className="photo-container"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <button 
            className="nav-button prev" 
            onClick={handlePrev}
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          
          <img 
            ref={mainPhotoRef}
            src={orderedImages[currentIndex]} 
            alt={`${currentIndex + 1} of ${orderedImages.length}`} 
            className="main-photo" 
            onClick={handleMainPhotoClick}
            draggable={false}
          />
          
          <button 
            className="nav-button next" 
            onClick={handleNext}
            aria-label="Next photo"
          >
            &#8250;
          </button>
        </div>
        
        <div className="thumbnail-bar-container">
          <div
            ref={thumbnailBarRef}
            className="thumbnail-bar"
          >
            {orderedImages.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="thumbnail-wrapper"
              >
                <img
                  src={image}
                  alt={`${index + 1}`}
                  className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => handleThumbnailClick(index)}
                  draggable={false}
                />
                <div className="thumbnail-order">{index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingPhotoGallery; 