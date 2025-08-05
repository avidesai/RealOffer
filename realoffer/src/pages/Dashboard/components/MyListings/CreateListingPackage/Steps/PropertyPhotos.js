// /CreateListingPackage/Steps/PropertyPhotos.js

import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const PropertyPhotos = ({ handleFileChange, handleRemovePhoto, handleReorderPhotos, handleSubmit, handlePrevStep, loading, formData, errors }) => {
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    // Create URL previews for the selected files
    const urls = formData.propertyImages.map(file => URL.createObjectURL(file));
    setPreviews(urls);

    // Cleanup URLs on unmount
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [formData.propertyImages]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.propertyImages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Use the dedicated reorder function instead of handleFileChange
    handleReorderPhotos(items);
  };

  // Drag-and-drop and click handler
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { name: 'propertyImages', files: e.dataTransfer.files } });
    }
  };

  const handleAreaClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileInputChange = (e) => {
    setIsUploading(true);
    try {
      handleFileChange(e);
    } catch (error) {
      console.error('Error handling file upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="clp-step">
      <h2>Property Photos</h2>
      
      {/* Error message display */}
      {errors.photos && (
        <div className="clp-error" style={{ marginBottom: '1rem' }}>
          {errors.photos}
        </div>
      )}
      
      <label
        className={`clp-photo-upload-area ${isUploading ? 'uploading' : ''}`}
        tabIndex={0}
        onClick={handleAreaClick}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleAreaClick()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        aria-label="Upload property photos"
      >
        {isUploading ? (
          <div className="clp-uploading-spinner">
            <div className="clp-spinner"></div>
            <span>Processing photos...</span>
          </div>
        ) : (
          <>
            <span className="clp-photo-upload-icon" aria-hidden="true">📷</span>
            <span className="clp-photo-upload-text">Click or drag photos to upload</span>
            <span className="clp-photo-upload-hint">JPG, PNG, up to 25MB each</span>
          </>
        )}
        <input
          type="file"
          name="propertyImages"
          multiple
          onChange={handleFileInputChange}
          className="clp-photo-upload-input"
          accept="image/*"
          ref={fileInputRef}
          tabIndex={-1}
        />
      </label>

      {previews.length > 0 && (
        <div className="photo-preview-container">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="photo-list" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="photo-preview-list"
                >
                  {previews.map((preview, index) => (
                    <Draggable
                      key={preview}
                      draggableId={preview}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="photo-preview-item"
                        >
                          <img src={preview} alt={`Preview ${index + 1}`} />
                          <div className="photo-preview-order">{index + 1}</div>
                          <button
                            type="button"
                            className="photo-preview-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(index);
                            }}
                            aria-label={`Remove photo ${index + 1}`}
                          >
                            ×
                          </button>
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
      )}

      <div className='clp-button-container'>
        <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
        <button className="clp-next-button" onClick={handleSubmit} disabled={loading}>
          Create Package
        </button>
      </div>
    </div>
  );
};

export default PropertyPhotos;
