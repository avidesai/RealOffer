// ListingPhotoGallery.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../../../../../../../../../context/api';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './ListingPhotoGallery.css';

const ListingPhotoGallery = ({ images, onClose, listingId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [orderedImages, setOrderedImages] = useState(images);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasPhotoChanges, setHasPhotoChanges] = useState(false);
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const thumbnailBarRef = useRef(null);
  const mainPhotoRef = useRef(null);
  const fileInputRef = useRef(null);
  const { logout } = useAuth();

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

  const updatePhotoOrder = async (newOrder) => {
    try {
      setIsUpdating(true);
      await api.put(
        `/api/propertyListings/${listingId}/photos`,
        { imageUrls: newOrder }
      );
      setHasPhotoChanges(true); // Mark that photos were changed
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.error('Authentication failed, token may be expired. Logging out.');
        await logout();
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

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

  const handleMainPhotoClick = (e) => {
    // Prevent navigation when clicking on the main photo
    e.stopPropagation();
  };

  const handleAddPhotos = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDeletePhotos = () => {
    setShowDeleteButtons(!showDeleteButtons);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    console.log('File upload triggered with files:', files);
    
    if (files.length === 0) {
      console.log('No files selected');
      return;
    }

    // Check file count limit (100 photos max per upload)
    if (files.length > 100) {
      console.error('Too many files selected:', files.length);
      alert(`You can only upload up to 100 photos at once. You selected ${files.length} photos. Please select fewer photos and try again.`);
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        console.error(`Invalid file type: ${file.type}`);
        return false;
      }
      
      // Check file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        console.error(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length !== files.length) {
      alert(`Some files were invalid. ${validFiles.length} of ${files.length} files will be uploaded.`);
    }

    try {
      setIsUpdating(true);
      console.log('Starting file upload for listing:', listingId);
      
      const formData = new FormData();
      validFiles.forEach(file => {
        console.log('Adding file to FormData:', file.name, file.size, file.type);
        formData.append('propertyImages', file);
      });

      const response = await api.post(`/api/propertyListings/${listingId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('File upload successful:', response.data);
      
      // Update the images with the new photos from the response
      setOrderedImages(response.data.imagesUrls);
      setHasPhotoChanges(true);
    } catch (error) {
      console.error('Error adding photos:', error);
      if (error.response && error.response.status === 401) {
        console.error('Authentication failed, token may be expired. Logging out.');
        await logout();
      } else {
        console.error('Error response:', error.response?.data);
        alert('Failed to upload photos. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePhoto = async (indexToDelete) => {
    try {
      setIsUpdating(true);
      const updatedImages = orderedImages.filter((_, index) => index !== indexToDelete);
      
      await api.put(`/api/propertyListings/${listingId}/photos`, {
        imageUrls: updatedImages
      });

      setOrderedImages(updatedImages);
      setHasPhotoChanges(true);
      
      // Adjust current index if necessary
      if (currentIndex >= updatedImages.length) {
        setCurrentIndex(Math.max(0, updatedImages.length - 1));
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.error('Authentication failed, token may be expired. Logging out.');
        await logout();
      } else {
        console.error('Error deleting photo:', error);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="photo-gallery-modal" onClick={() => onClose(hasPhotoChanges)}>
      <div className="photo-gallery-content" onClick={(e) => e.stopPropagation()}>
        <div className="photo-gallery-header">
          <div className="photo-gallery-controls">
            <button 
              className="photo-gallery-control-button add-photos"
              onClick={handleAddPhotos}
              aria-label="Add photos"
            >
              Add Photos
            </button>
            {orderedImages.length > 0 && (
              <button 
                className={`photo-gallery-control-button delete-photos ${showDeleteButtons ? 'active' : ''}`}
                onClick={handleDeletePhotos}
                aria-label="Delete photos"
              >
                {showDeleteButtons ? 'Done Deleting' : 'Delete Photos'}
              </button>
            )}
          </div>
          {isUpdating && <div className="photo-gallery-updating">Updating photos...</div>}
          <button 
            className="photo-gallery-close-button" 
            onClick={() => onClose(hasPhotoChanges)}
            aria-label="Close gallery"
          ></button>
        </div>
        
        {orderedImages.length === 0 ? (
          <div className="photo-gallery-empty">
            <div className="photo-gallery-empty-content">
              <span className="photo-gallery-empty-icon">📷</span>
              <h3>No Photos Yet</h3>
              <p>Click "Add Photos" to upload property images</p>
              <button 
                className="photo-gallery-add-first-photos"
                onClick={handleAddPhotos}
              >
                Add Photos
              </button>
            </div>
          </div>
        ) : (
          <>
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
                                alt={`${index + 1}`}
                                className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                                onClick={() => handleThumbnailClick(index)}
                                draggable={false}
                              />
                              <div className="thumbnail-order">{index + 1}</div>
                              {showDeleteButtons && (
                                <button
                                  className="thumbnail-delete-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(index);
                                  }}
                                  aria-label={`Delete photo ${index + 1}`}
                                >
                                  ×
                                </button>
                              )}
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
          </>
        )}
        
        {/* Hidden file input for adding photos */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default ListingPhotoGallery;