// /src/pages/Dashboard/components/ForBuyers/BuyerPackageDashboard/Tabs/BuyerPackageDocuments/components/PDFViewer/PDFViewerLogic.js

import { useState, useEffect, useCallback } from 'react';

const PDFViewerLogic = ({ fileUrl, docTitle, docType, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
    setIsLoading(true);
    setError(null);
  }, [fileUrl]);

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
    handleDownload,
    setCurrentPage,
    docTitle,
    docType,
    onClose,
  };
};

export default PDFViewerLogic; 