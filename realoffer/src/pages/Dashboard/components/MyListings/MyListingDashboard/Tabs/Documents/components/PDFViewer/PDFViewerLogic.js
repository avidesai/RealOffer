// /src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/components/PDFViewer/PDFViewerLogic.js

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';

const PDFViewerLogic = ({ fileUrl, docTitle, docType, onClose }) => {
  const { token } = useAuth();
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate responsive scale based on screen size
  const calculateResponsiveScale = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Mobile devices (portrait)
    if (width <= 768 && height > width) {
      return 0.8;
    }
    // Mobile devices (landscape)
    else if (width <= 1024 && height <= 768) {
      return 1.0;
    }
    // Tablets
    else if (width <= 1024) {
      return 1.2;
    }
    // Small desktop
    else if (width <= 1366) {
      return 1.3;
    }
    // Medium desktop
    else if (width <= 1920) {
      return 1.5;
    }
    // Large desktop
    else {
      return 1.8;
    }
  }, []);

  // Initialize scale based on screen size
  useEffect(() => {
    const initialScale = calculateResponsiveScale();
    setScale(initialScale);
  }, [calculateResponsiveScale]);

  // Handle window resize for responsive zoom
  useEffect(() => {
    const handleResize = () => {
      const newScale = calculateResponsiveScale();
      setScale(newScale);
    };

    // Debounce resize events for better performance
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [calculateResponsiveScale]);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setIsLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load the document. Please try again.');
    setIsLoading(false);
  }, []);

  const changePage = useCallback((offset) => {
    setCurrentPage(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return newPage >= 1 && newPage <= numPages ? newPage : prevPageNumber;
    });
  }, [numPages]);

  const goToPage = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= numPages) {
      setCurrentPage(pageNumber);
    }
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setScale(prevScale => {
      const newScale = prevScale + 0.2;
      return newScale <= 3 ? newScale : prevScale;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prevScale => {
      const newScale = prevScale - 0.2;
      return newScale >= 0.5 ? newScale : prevScale;
    });
  }, []);

  // Reset zoom to responsive level
  const resetZoom = useCallback(() => {
    const responsiveScale = calculateResponsiveScale();
    setScale(responsiveScale);
  }, [calculateResponsiveScale]);

  const handleDownload = useCallback(() => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = docTitle || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [fileUrl, docTitle]);

  return {
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
    resetZoom,
    handleDownload,
  };
};

export default PDFViewerLogic;