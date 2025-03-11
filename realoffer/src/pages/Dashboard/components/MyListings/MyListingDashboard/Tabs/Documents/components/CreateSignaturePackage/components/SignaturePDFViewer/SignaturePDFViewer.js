// /src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/components/CreateSignaturePackage/components/SignaturePDFViewer/SignaturePDFViewer.js

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../../../context/AuthContext';
import './pdfWorker'; // Import the worker initialization
import './SignaturePDFViewer.css';
import { throttle } from 'lodash';

const SignaturePDFViewer = ({ fileUrl, documentTitle, documentId, signaturePackagePages = [], onPageSelectionChange, onClose }) => {
  const { token } = useAuth();
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(0.6);
  const [localSelectedPages, setLocalSelectedPages] = useState([]);
  const [visiblePages, setVisiblePages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const pageRefs = useRef({});
  const scrollTimeoutRef = useRef(null);

  // Initialize selected pages from props
  useEffect(() => {
    setLocalSelectedPages(signaturePackagePages || []);
  }, [signaturePackagePages]);

  // Reset state when document changes
  useEffect(() => {
    setCurrentPage(1);
    setIsLoading(true);
    setError(null);
    setVisiblePages([]);
    pageRefs.current = {};
  }, [fileUrl, documentId]);

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setIsLoading(false);
  };

  const handleDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load the document. Please try again.');
    setIsLoading(false);
  };

  // Wrap handlePageSelect in useCallback to prevent it from changing on every render
  const handlePageSelect = useCallback(async (pageIndex, isSelected) => {
    try {
      // Update local state immediately for responsive UI
      setLocalSelectedPages((prev) =>
        isSelected ? prev.filter((page) => page !== pageIndex) : [...prev, pageIndex]
      );
      
      // Create a copy of the current document with updated pages
      const updatedPages = isSelected 
        ? localSelectedPages.filter(page => page !== pageIndex)
        : [...localSelectedPages, pageIndex];
      
      const updatedDocument = {
        _id: documentId,
        title: documentTitle,
        signaturePackagePages: updatedPages
      };
      
      // Notify parent component of the change
      if (onPageSelectionChange) {
        onPageSelectionChange(updatedDocument);
      }
      
      // Then update the server in the background
      setTimeout(async () => {
        try {
          const url = `${process.env.REACT_APP_BACKEND_URL}/api/documents/${isSelected ? 'removePage' : 'addPage'}`;
          await axios.post(url, { documentId, page: pageIndex }, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error('Error updating page selection:', error);
          // The UI is already updated, so the user can continue working
        }
      }, 0);
    } catch (error) {
      console.error('Error in page selection:', error);
      setError('Failed to update page selection. Please try again.');
    }
  }, [documentId, documentTitle, localSelectedPages, token, onPageSelectionChange]);

  // Handle click on the page container to toggle selection
  const handlePageClick = useCallback((pageIndex, isSelected) => {
    handlePageSelect(pageIndex, isSelected);
  }, [handlePageSelect]);

  const handleSelectAllPages = useCallback(async () => {
    if (!numPages) return;
    
    try {
      const allPages = Array.from({ length: numPages }, (_, i) => i + 1);
      const currentlySelectedPages = new Set(localSelectedPages);
      const allSelected = allPages.every(page => currentlySelectedPages.has(page));
      
      // Create a copy of the current document with updated pages
      const updatedDocument = {
        _id: documentId,
        title: documentTitle,
        signaturePackagePages: allSelected ? [] : allPages
      };
      
      // Update local state immediately for responsive UI
      setLocalSelectedPages(allSelected ? [] : allPages);
      
      // Notify parent component of the change
      if (onPageSelectionChange) {
        onPageSelectionChange(updatedDocument);
      }
      
      // Then update the server one page at a time in the background
      setTimeout(async () => {
        try {
          if (allSelected) {
            // Remove each page individually
            for (const page of allPages) {
              try {
                await axios.post(
                  `${process.env.REACT_APP_BACKEND_URL}/api/documents/removePage`,
                  { documentId, page },
                  { headers: { 'Authorization': `Bearer ${token}` } }
                );
              } catch (error) {
                console.error(`Error removing page ${page}:`, error);
                // Continue with other pages even if one fails
              }
            }
          } else {
            // Add each page individually
            for (const page of allPages) {
              if (!currentlySelectedPages.has(page)) {
                try {
                  await axios.post(
                    `${process.env.REACT_APP_BACKEND_URL}/api/documents/addPage`,
                    { documentId, page },
                    { headers: { 'Authorization': `Bearer ${token}` } }
                  );
                } catch (error) {
                  console.error(`Error adding page ${page}:`, error);
                  // Continue with other pages even if one fails
                }
              }
            }
          }
        } catch (updateError) {
          console.error('Error updating pages on server:', updateError);
          // The UI is already updated, so the user can continue working
        }
      }, 0);
    } catch (error) {
      console.error('Error in select/deselect all operation:', error);
      setError('An error occurred. The pages may not be properly selected/deselected on the server.');
    }
  }, [documentId, documentTitle, numPages, localSelectedPages, token, onPageSelectionChange]);

  // Setup Intersection Observer for lazy loading pages
  useEffect(() => {
    if (!containerRef.current || !numPages) return;
    
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    const options = {
      root: containerRef.current,
      rootMargin: '200px 0px',
      threshold: 0.1
    };
    
    const handleIntersection = (entries) => {
      const newVisiblePages = [...visiblePages];
      
      entries.forEach(entry => {
        const pageNumber = parseInt(entry.target.dataset.page, 10);
        
        if (entry.isIntersecting && !newVisiblePages.includes(pageNumber)) {
          newVisiblePages.push(pageNumber);
        }
      });
      
      setVisiblePages(newVisiblePages);
    };
    
    observerRef.current = new IntersectionObserver(handleIntersection, options);
    
    // Add placeholders to the DOM for all pages
    for (let i = 1; i <= numPages; i++) {
      if (pageRefs.current[i] && pageRefs.current[i].current) {
        observerRef.current.observe(pageRefs.current[i].current);
      }
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [numPages, visiblePages]); // Added visiblePages as a dependency

  // Function to determine the most visible page
  const determineVisiblePage = useCallback(() => {
    if (!containerRef.current || !numPages) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerHeight = containerRect.height;
    
    // Find the page that is most visible in the viewport
    let maxVisiblePage = 1;
    let maxVisibleArea = 0;
    
    for (let i = 1; i <= numPages; i++) {
      const pageRef = pageRefs.current[i]?.current;
      if (!pageRef) continue;
      
      const rect = pageRef.getBoundingClientRect();
      
      // Calculate how much of the page is visible
      const visibleTop = Math.max(rect.top, containerTop);
      const visibleBottom = Math.min(rect.bottom, containerTop + containerHeight);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibleArea = visibleHeight / rect.height;
      
      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        maxVisiblePage = i;
      }
    }
    
    if (maxVisiblePage !== currentPage) {
      setCurrentPage(maxVisiblePage);
    }
  }, [numPages, currentPage]);

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a timeout to determine the visible page after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      determineVisiblePage();
    }, 50);
  }, [determineVisiblePage]);

  // Throttle the scroll handler to improve performance
  const throttledScrollHandler = useMemo(
    () => throttle(handleScroll, 50),
    [handleScroll]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', throttledScrollHandler);
      return () => {
        container.removeEventListener('scroll', throttledScrollHandler);
        throttledScrollHandler.cancel(); // Cancel any pending throttled calls
        
        // Clear any pending timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [throttledScrollHandler]);

  const zoomIn = useCallback(() => 
    setScale((prevScale) => Math.min(prevScale + 0.1, 2.0)), 
  []);
  
  const zoomOut = useCallback(() => 
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.3)), 
  []);

  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > numPages) return;
    
    setCurrentPage(newPage);
    
    // Scroll to the page
    const pageRef = pageRefs.current[newPage]?.current;
    if (pageRef && containerRef.current) {
      pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [numPages]);

  // Create page placeholders for all pages
  useEffect(() => {
    if (!numPages) return;
    
    // Initialize refs for all pages
    for (let i = 1; i <= numPages; i++) {
      if (!pageRefs.current[i]) {
        pageRefs.current[i] = React.createRef();
      }
    }
  }, [numPages]);

  // Memoize the page components to prevent unnecessary re-renders
  const pageComponents = useMemo(() => {
    if (!numPages) return [];
    
    return Array.from({ length: numPages }, (_, i) => {
      const pageNumber = i + 1;
      const isSelected = localSelectedPages.includes(pageNumber);
      
      // Create ref if it doesn't exist
      if (!pageRefs.current[pageNumber]) {
        pageRefs.current[pageNumber] = React.createRef();
      }
      
      return (
        <div
          key={`page-${pageNumber}`}
          ref={pageRefs.current[pageNumber]}
          data-page={pageNumber}
          className={`spv-pdf-page-container ${isSelected ? 'selected' : ''}`}
          onClick={() => handlePageClick(pageNumber, isSelected)}
        >
          <div className="spv-page-wrapper">
            {visiblePages.includes(pageNumber) ? (
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={<div className="spv-page-loading">Loading page {pageNumber}...</div>}
                onRenderSuccess={() => {
                  // After the first page renders, determine the visible page
                  if (pageNumber === 1) {
                    setTimeout(determineVisiblePage, 100);
                  }
                }}
              />
            ) : (
              <div className="spv-page-placeholder" style={{ height: `${scale * 792}px` }}>
                <span>Page {pageNumber}</span>
              </div>
            )}
          </div>
          <div className="spv-overlay">
            <div
              className="spv-checkbox"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the parent's onClick
                handlePageSelect(pageNumber, isSelected);
              }}
            >
              {isSelected && <span>✓</span>}
            </div>
          </div>
          {isSelected && (
            <div className="spv-page-selected-indicator">
              Selected
            </div>
          )}
        </div>
      );
    });
  }, [numPages, scale, localSelectedPages, visiblePages, handlePageSelect, handlePageClick, determineVisiblePage]);

  // Calculate if all pages are selected
  const allPagesSelected = useMemo(() => {
    if (!numPages) return false;
    return localSelectedPages.length === numPages;
  }, [localSelectedPages, numPages]);

  return (
    <div className="spv-container">
      <div className="spv-pdf-header">
        <h3>{documentTitle}</h3>
        <div className="spv-toolbar">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous page"
          >
            <FiChevronLeft />
          </button>
          <span className="spv-page-info">
            {currentPage} / {numPages || '?'}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= numPages}
            title="Next page"
          >
            <FiChevronRight />
          </button>
          <button onClick={zoomOut} title="Zoom out">
            <FiZoomOut />
          </button>
          <button onClick={zoomIn} title="Zoom in">
            <FiZoomIn />
          </button>
          <button
            className="spv-select-all-button"
            onClick={handleSelectAllPages}
            disabled={!numPages}
            title={allPagesSelected ? "Deselect all pages" : "Select all pages"}
          >
            {allPagesSelected ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
            <span>{allPagesSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="spv-error-message">
          {error}
        </div>
      )}
      
      <div className="spv-body" ref={containerRef}>
        {isLoading && (
          <div className="spv-pdf-spinner-overlay">
            <div className="spv-pdf-spinner"></div>
          </div>
        )}
        
        <Document
          file={fileUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={null}
        >
          {pageComponents}
        </Document>
      </div>
    </div>
  );
};

export default SignaturePDFViewer;
