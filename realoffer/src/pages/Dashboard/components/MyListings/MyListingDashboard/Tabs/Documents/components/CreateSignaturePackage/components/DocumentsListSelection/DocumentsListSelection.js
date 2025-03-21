// /src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/components/CreateSignaturePackage/components/DocumentsListSelection/DocumentsListSelection.js

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import './DocumentsListSelection.css';

const DocumentsListSelection = ({ 
  documents = [], 
  onDocumentSelect = () => {}, 
  onReorderDocuments = () => {} 
}) => {
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [orderedDocuments, setOrderedDocuments] = useState([]);

  useEffect(() => {
    setOrderedDocuments(documents);
    if (documents.length > 0 && !selectedDocumentId) {
      setSelectedDocumentId(documents[0]._id);
      onDocumentSelect(documents[0]);
    }
  }, [documents, selectedDocumentId, onDocumentSelect]);

  const handleDocumentClick = useCallback((document) => {
    setSelectedDocumentId(document._id);
    onDocumentSelect(document);
  }, [onDocumentSelect]);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    
    const items = Array.from(orderedDocuments);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setOrderedDocuments(items);
    if (onReorderDocuments) {
      onReorderDocuments(items);
    }
  }, [orderedDocuments, onReorderDocuments]);

  const moveDocument = useCallback((index, direction) => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === orderedDocuments.length - 1)) {
      return;
    }
    
    const items = Array.from(orderedDocuments);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    
    setOrderedDocuments(items);
    if (onReorderDocuments) {
      onReorderDocuments(items);
    }
  }, [orderedDocuments, onReorderDocuments]);

  // Function to render the page selection status
  const renderPageSelectionStatus = useCallback((document) => {
    const count = document.signaturePackagePages.length;
    
    if (count === 0) {
      return "No pages selected";
    } else if (count === 1) {
      return "1 page selected";
    } else {
      return `${count} pages selected`;
    }
  }, []);

  return (
    <div className="dls-documents-list">
      <h3>Documents</h3>
      <p>Browse documents below and select pages to add to your disclosure signature packet. Drag to reorder.</p>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="documents" type="DOCUMENTS">
          {(provided) => (
            <ul
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="dls-documents-list-container"
            >
              {orderedDocuments.map((document, index) => (
                <Draggable 
                  key={document._id} 
                  draggableId={document._id.toString()} 
                  index={index}
                >
                  {(provided, snapshot) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`dls-document-item ${selectedDocumentId === document._id ? 'selected' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                    >
                      <div 
                        className="dls-document-info"
                        onClick={() => handleDocumentClick(document)}
                      >
                        <span className="dls-document-title">{document.title}</span>
                        <span className="dls-document-type">{document.type}</span>
                        <span className={`dls-document-pages ${document.signaturePackagePages.length > 0 ? 'morethanzero' : ''}`}>
                          {renderPageSelectionStatus(document)}
                        </span>
                      </div>
                      <div className="dls-document-controls">
                        <div {...provided.dragHandleProps} className="dls-drag-handle">
                          <span className="dls-drag-icon">≡</span>
                        </div>
                        <div className="dls-arrow-controls">
                          <button 
                            className="dls-arrow-button" 
                            onClick={() => moveDocument(index, 'up')}
                            disabled={index === 0}
                            title="Move up"
                            type="button"
                          >
                            <FiArrowUp />
                          </button>
                          <button 
                            className="dls-arrow-button" 
                            onClick={() => moveDocument(index, 'down')}
                            disabled={index === orderedDocuments.length - 1}
                            title="Move down"
                            type="button"
                          >
                            <FiArrowDown />
                          </button>
                        </div>
                      </div>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default DocumentsListSelection;