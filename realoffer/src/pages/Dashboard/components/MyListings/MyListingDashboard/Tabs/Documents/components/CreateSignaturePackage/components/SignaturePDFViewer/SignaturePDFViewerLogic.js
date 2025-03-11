// /src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/components/CreateSignaturePackage/components/SignaturePDFViewer/SignaturePDFViewerLogic.js

import { useState, useEffect } from 'react';
import './pdfWorker'; // Import the worker initialization

const SignaturePDFViewerLogic = ({ fileUrl, docTitle, docType, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(0.6); // Set initial scale

  useEffect(() => {
    setCurrentPage(1);
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const changePage = (offset) => {
    setCurrentPage(prevPage => {
      const newPage = prevPage + offset;
      return newPage > 0 && newPage <= numPages ? newPage : prevPage;
    });
  };

  const zoomIn = () => setScale((prevScale) => Math.min(prevScale + 0.1, 3));

  const zoomOut = () => setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));

  return {
    numPages,
    currentPage,
    scale,
    setCurrentPage,
    onDocumentLoadSuccess,
    changePage,
    zoomIn,
    zoomOut,
    docTitle,
    docType,
    onClose,
  };
};

export default SignaturePDFViewerLogic;
