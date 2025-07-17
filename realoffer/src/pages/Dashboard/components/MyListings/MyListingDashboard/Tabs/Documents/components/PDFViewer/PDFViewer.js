// /src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/components/PDFViewer/PDFViewer.js

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut, FiDownload, FiX } from 'react-icons/fi';
import { throttle } from 'lodash';
import PDFViewerLogic from './PDFViewerLogic';
import './PDFViewer.css';

const PDFViewer = ({ fileUrl, docTitle, docType, onClose }) => {
  const {
    numPages,
    currentPage,
    scale,
    isLoading,
    error,
    onDocumentLoadSuccess,
    onDocumentLoadError,
    changePage,
    goToPage,
    zoomIn,
    zoomOut,
    handleDownload,
  } = PDFViewerLogic({ fileUrl, docTitle, docType, onClose });

  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [visiblePages, setVisiblePages] = useState([]);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const pageRefs = useRef({});
  const toolbarTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Define showToolbar before it's used in other functions
  const showToolbar = useCallback(() => {
    setIsToolbarVisible(true);
    
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
    
    toolbarTimeoutRef.current = setTimeout(() => {
      setIsToolbarVisible(false);
    }, 3000);
  }, []);

  const hideToolbarWithDelay = useCallback(() => {
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
    
    toolbarTimeoutRef.current = setTimeout(() => {
      setIsToolbarVisible(false);
    }, 3000);
  }, []);

  // Setup Intersection Observer for lazy loading pages
  useEffect(() => {
    if (!containerRef.current || !numPages) return;
    
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    const options = {
      root: containerRef.current,
      rootMargin: '300px 0px',
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
  }, [numPages, visiblePages]);

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
      goToPage(maxVisiblePage);
    }
  }, [numPages, currentPage, goToPage]);

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    // Show toolbar on scroll
    showToolbar();
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a timeout to determine the visible page after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      determineVisiblePage();
    }, 100);
  }, [determineVisiblePage, showToolbar]);

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

  // Set up toolbar auto-hide on initial render
  useEffect(() => {
    showToolbar();
    
    return () => {
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
    };
  }, [showToolbar]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        changePage(1);
        showToolbar();
      } else if (e.key === 'ArrowLeft') {
        changePage(-1);
        showToolbar();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [changePage, onClose, showToolbar]);

  // Memoize the page components to prevent unnecessary re-renders
  const pageComponents = useMemo(() => {
    if (!numPages) return [];
    
    return Array.from({ length: numPages }, (_, i) => {
      const pageNumber = i + 1;
      
      // Create ref if it doesn't exist
      if (!pageRefs.current[pageNumber]) {
        pageRefs.current[pageNumber] = React.createRef();
      }
      
      return (
        <div
          key={`page-${pageNumber}`}
          ref={pageRefs.current[pageNumber]}
          data-page={pageNumber}
          className="ml-pdf-page-container"
        >
          {visiblePages.includes(pageNumber) ? (
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={<div className="ml-pdf-page-loading">Loading page {pageNumber}...</div>}
              onRenderSuccess={() => {
                // After the first page renders, determine the visible page
                if (pageNumber === 1) {
                  setTimeout(determineVisiblePage, 100);
                }
              }}
            />
          ) : (
            <div className="ml-pdf-page-placeholder" style={{ height: `${scale * 792}px` }}>
              <span>Page {pageNumber}</span>
            </div>
          )}
        </div>
      );
    });
  }, [numPages, scale, visiblePages, determineVisiblePage]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > numPages) return;
    
    goToPage(newPage);
    
    // Scroll to the page
    const pageRef = pageRefs.current[newPage]?.current;
    if (pageRef && containerRef.current) {
      pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    showToolbar();
  }, [numPages, goToPage, showToolbar]);

  return (
    <div 
      className="ml-pdf-viewer-modal"
      onMouseMove={showToolbar}
      onClick={showToolbar}
    >
      <div className="ml-pdf-viewer-header">
        <div className="ml-pdf-title-container">
          <h2 className="ml-pdf-title">{docTitle}</h2>
          <span className="ml-pdf-type">{docType}</span>
        </div>
        <button className="ml-pdfviewer-close-button" onClick={onClose}>
          <FiX />
        </button>
      </div>
      
      {error && (
        <div className="ml-pdf-error-message">
          {error}
        </div>
      )}
      
      <div 
        className="ml-pdf-viewer-container" 
        ref={containerRef}
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbarWithDelay}
      >
        {isLoading && (
          <div className="ml-pdf-spinner-overlay">
            <div className="ml-pdf-spinner"></div>
          </div>
        )}
        
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
        >
          {pageComponents}
        </Document>
      </div>
      
      <div className={`ml-pdf-toolbar-container ${isToolbarVisible ? 'visible' : ''}`}>
        <div className="ml-pdf-toolbar">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
            <FiChevronLeft />
          </button>
          <span className="ml-page-info">
            {currentPage} / {numPages || '?'}
          </span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= numPages}>
            <FiChevronRight />
          </button>
          <button onClick={zoomOut} disabled={scale <= 0.5}>
            <FiZoomOut />
          </button>
          <button onClick={zoomIn} disabled={scale >= 3}>
            <FiZoomIn />
          </button>
          <button onClick={handleDownload}>
            <FiDownload />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;