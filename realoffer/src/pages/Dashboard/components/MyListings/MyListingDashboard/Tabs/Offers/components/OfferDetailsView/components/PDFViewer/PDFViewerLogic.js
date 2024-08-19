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
    console.log('PDFViewerLogic: fileUrl changed, resetting currentPage to 1');
    setCurrentPage(1);
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log(`PDFViewerLogic: Document loaded successfully with ${numPages} pages`);
    setNumPages(numPages);
    console.log('PDFViewerLogic: Setting currentPage to 1 in onDocumentLoadSuccess');
    setCurrentPage(1);
  };

  const changePage = (offset) => {
    setCurrentPage((prevPage) => {
      const newPage = prevPage + offset;
      console.log(`PDFViewerLogic: Changing page from ${prevPage} to ${newPage}`);
      return newPage > 0 && newPage <= numPages ? newPage : prevPage;
    });
  };

  const zoomIn = () => setScale((prevScale) => {
    const newScale = Math.min(prevScale + 0.1, 3);
    console.log(`PDFViewerLogic: Zooming in from ${prevScale} to ${newScale}`);
    return newScale;
  });

  const zoomOut = () => setScale((prevScale) => {
    const newScale = Math.max(prevScale - 0.1, 0.5);
    console.log(`PDFViewerLogic: Zooming out from ${prevScale} to ${newScale}`);
    return newScale;
  });

  const handleDownload = () => {
    console.log('PDFViewerLogic: Downloading document');
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = docTitle || 'document.pdf';
    link.click();
  };

  useEffect(() => {
    console.log(`PDFViewerLogic: currentPage changed to ${currentPage}`);
  }, [currentPage]);

  return {
    numPages,
    currentPage,
    scale,
    setScale,
    setCurrentPage: (page) => {
      console.log(`PDFViewerLogic: setCurrentPage called with page ${page}`);
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