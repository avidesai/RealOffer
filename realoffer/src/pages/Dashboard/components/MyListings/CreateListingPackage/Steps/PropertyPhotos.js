// /CreateListingPackage/Steps/PropertyPhotos.js

import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const PropertyPhotos = ({ handleFileChange, handleSubmit, handlePrevStep, loading, formData }) => {
  const [previews, setPreviews] = useState([]);
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
    const previewItems = Array.from(previews);
    const [reorderedItem] = items.splice(result.source.index, 1);
    const [reorderedPreview] = previewItems.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    previewItems.splice(result.destination.index, 0, reorderedPreview);

    // Update the file order in the parent component
    const newFileList = new DataTransfer();
    items.forEach(file => newFileList.items.add(file));
    handleFileChange({
      target: {
        name: 'propertyImages',
        files: newFileList.files
      }
    });
    setPreviews(previewItems);
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

  return (
    <div className="clp-step">
      <h2>Property Photos (Optional)</h2>
      <label
        className="clp-photo-upload-area"
        tabIndex={0}
        onClick={handleAreaClick}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleAreaClick()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        aria-label="Upload property photos"
      >
        <span className="clp-photo-upload-icon" aria-hidden="true">📷</span>
        <span className="clp-photo-upload-text">Click or drag photos to upload</span>
        <span className="clp-photo-upload-hint">JPG, PNG, up to 10MB each</span>
        <input
          type="file"
          name="propertyImages"
          multiple
          onChange={handleFileChange}
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
