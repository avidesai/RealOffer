import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './UploadDocumentsModal.css';

const UploadDocumentsModal = ({
  onClose,
  files,
  uploading,
  errors,
  fileInputRef,
  handleDragOver,
  handleDrop,
  handleFileSelect,
  handleUploadClick,
  handleDeleteFile,
  handleFileTypeChange,
  handleFileTitleChange,
  handleDragEnd,
  handleUpload,
}) => {
  return (
    <div className="upload-documents-modal" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="udm-modal-content">
        <button className="udm-close-button" onClick={onClose}></button>
        <div className='udm-modal-header'>
          <h2>Add Documents</h2>
          <p>Upload disclosure documents for this listing.</p>
        </div>
        <div className="udm-upload-area">
          <div className="udm-drag-drop">
            <button className="udm-upload-button" onClick={handleUploadClick}>
              Select Files
            </button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept="application/pdf, image/*"
            />
          </div>
        </div>
        {errors.length > 0 && (
          <div className="udm-upload-errors">
            {errors.map((error, index) => (
              <p key={index} className="udm-upload-error">{error}</p>
            ))}
          </div>
        )}
        {uploading && <div className="udm-upload-spinner-container"><div className="udm-upload-spinner"></div></div>}
        <div className="udm-file-list-container">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="file-list">
              {(provided) => (
                <div 
                  className="udm-file-list"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {files.map((file, index) => (
                    <Draggable key={`file-${index}`} draggableId={`file-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`udm-file-item ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <div className="udm-file-drag-handle">
                            <span className="drag-icon">⋮⋮</span>
                          </div>
                          <div className="udm-file-title">
                            <input
                              type="text"
                              value={file.title || file.file.name}
                              onChange={(e) => handleFileTitleChange(index, e.target.value)}
                              placeholder="Document Title"
                              className="udm-file-title-input"
                            />
                          </div>
                          <div className="udm-file-type">
                            <select
                              value={file.type}
                              onChange={(e) => handleFileTypeChange(index, e.target.value)}
                              className="udm-file-type-select"
                            >
                              <option value="">Select Type</option>
                              <option value="Coversheet">Coversheet</option>
                              <option value="Offer Instructions">Offer Instructions</option>
                              <option value="Home Inspection Report">Home Inspection Report</option>
                              <option value="Pest Inspection Report">Pest Inspection Report</option>
                              <option value="Natural Hazard Disclosures">Natural Hazard Disclosures</option>
                              <option value="Lead Based Paint Disclosures">Lead Based Paint Disclosures</option>
                              <option value="Seller Property Questionnaire">Seller Property Questionnaire</option>
                              <option value="Agent Visual Inspection">Agent Visual Inspection</option>
                              <option value="Preliminary Title Report">Preliminary Title Report</option>
                              <option value="Real Estate Transfer Disclosure Statement">Real Estate Transfer Disclosure Statement</option>
                              <option value="HOA Documents">HOA Documents</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="udm-file-delete">
                            <button className="udm-delete-file-button" onClick={() => handleDeleteFile(index)}>Delete</button>
                          </div>
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
        {files.length > 0 && (
          <div className="udm-modal-footer">
            <button className="udm-upload-files-button" onClick={handleUpload}>Upload Documents</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDocumentsModal;