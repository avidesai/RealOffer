// PDFViewerLogic.js

import { useState, useEffect } from 'react';
import { pdfjs } from 'react-pdf';

const PDFViewerLogic = ({ fileUrl, docTitle, docType, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const changePage = (offset) => {
    setCurrentPage((prevPage) => {
      const newPage = prevPage + offset;
      return newPage > 0 && newPage <= numPages ? newPage : prevPage;
    });
  };

  const zoomIn = () => setScale((prevScale) => {
    const newScale = Math.min(prevScale + 0.1, 3);
    return newScale;
  });

  const zoomOut = () => setScale((prevScale) => {
    const newScale = Math.max(prevScale - 0.1, 0.5);
    return newScale;
  });

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = docTitle || 'document.pdf';
    link.click();
  };

  useEffect(() => {
  }, [currentPage]);

  return {
    numPages,
    currentPage,
    scale,
    setScale,
    setCurrentPage: (page) => {
      setCurrentPage(page);
    },
    onDocumentLoadSuccess,
    changePage,
    zoomIn,
    zoomOut,
    handleDownload,
    docTitle,
    docType,
    onClose,
  };
};

export default PDFViewerLogic;