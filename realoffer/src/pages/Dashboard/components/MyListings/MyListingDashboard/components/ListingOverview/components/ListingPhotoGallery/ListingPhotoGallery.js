// ListingPhotoGallery.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './ListingPhotoGallery.css';

const ListingPhotoGallery = ({ images, onClose, listingId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [orderedImages, setOrderedImages] = useState(images);
  const [isUpdating, setIsUpdating] = useState(false);
  const thumbnailBarRef = useRef(null);
  const { token, logout } = useAuth();

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
    if (event.key === 'ArrowLeft') {
      handlePrev();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    } else if (event.key === 'Escape') {
      onClose();
    }
  }, [handlePrev, handleNext, onClose]);

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
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  const updatePhotoOrder = async (newOrder) => {
    try {
      setIsUpdating(true);
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}/photos`,
        { imageUrls: newOrder },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.error('Authentication failed, token may be expired. Logging out.');
        logout();
      } else {
        console.error('Error updating photo order:', error);
        // Revert to original order on error
        setOrderedImages(images);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(orderedImages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedImages(items);

    // Update current index if the current image was moved
    if (currentIndex === result.source.index) {
      setCurrentIndex(result.destination.index);
    } else if (
      currentIndex >= result.destination.index && 
      currentIndex < result.source.index
    ) {
      setCurrentIndex(currentIndex + 1);
    } else if (
      currentIndex <= result.destination.index && 
      currentIndex > result.source.index
    ) {
      setCurrentIndex(currentIndex - 1);
    }

    // Update the backend
    updatePhotoOrder(items);
  };

  return (
    <div className="photo-gallery-modal" onClick={onClose}>
      <div className="photo-gallery-content" onClick={(e) => e.stopPropagation()}>
        <div className="photo-gallery-header">
          {isUpdating && <div className="photo-gallery-updating">Updating order...</div>}
          <button className="photo-gallery-close-button" onClick={onClose}></button>
        </div>
        <div className="photo-container">
          <button className="nav-button prev" onClick={handlePrev}>&#8249;</button>
          <img src={orderedImages[currentIndex]} alt={`${currentIndex + 1}`} className="main-photo" />
          <button className="nav-button next" onClick={handleNext}>&#8250;</button>
        </div>
        <div className="thumbnail-bar-container">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="thumbnail-list" direction="horizontal">
              {(provided) => (
                <div
                  ref={(el) => {
                    thumbnailBarRef.current = el;
                    provided.innerRef(el);
                  }}
                  {...provided.droppableProps}
                  className="thumbnail-bar"
                >
                  {orderedImages.map((image, index) => (
                    <Draggable
                      key={`${image}-${index}`}
                      draggableId={`${image}-${index}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`thumbnail-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <img
                            src={image}
                            alt={`Thumbnail ${index + 1}`}
                            className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(index)}
                          />
                          <div className="thumbnail-order">{index + 1}</div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
};

export default ListingPhotoGallery;
