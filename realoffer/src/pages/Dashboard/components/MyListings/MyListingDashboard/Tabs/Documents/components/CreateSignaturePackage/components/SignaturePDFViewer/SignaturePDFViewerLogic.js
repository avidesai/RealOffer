import { useState, useEffect } from 'react';
import { pdfjs } from 'react-pdf';

const SignaturePDFViewerLogic = ({ fileUrl, docTitle, docType, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(0.6); // Set initial scale much smaller

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }, []);

  useEffect(() => {
    console.log('SignaturePDFViewerLogic: fileUrl changed, resetting currentPage to 1');
    setCurrentPage(1);
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log(`SignaturePDFViewerLogic: Document loaded successfully with ${numPages} pages`);
    setNumPages(numPages);
    console.log('SignaturePDFViewerLogic: Setting currentPage to 1 in onDocumentLoadSuccess');
    setCurrentPage(1);
  };

  const changePage = (offset) => {
    setCurrentPage((prevPage) => {
      const newPage = prevPage + offset;
      console.log(`SignaturePDFViewerLogic: Changing page from ${prevPage} to ${newPage}`);
      return newPage > 0 && newPage <= numPages ? newPage : prevPage;
    });
  };

  const zoomIn = () => setScale((prevScale) => {
    const newScale = Math.min(prevScale + 0.1, 3);
    console.log(`SignaturePDFViewerLogic: Zooming in from ${prevScale} to ${newScale}`);
    return newScale;
  });

  const zoomOut = () => setScale((prevScale) => {
    const newScale = Math.max(prevScale - 0.1, 0.5);
    console.log(`SignaturePDFViewerLogic: Zooming out from ${prevScale} to ${newScale}`);
    return newScale;
  });

  return {
    numPages,
    currentPage,
    scale,
    setScale,
    setCurrentPage: (page) => {
      console.log(`SignaturePDFViewerLogic: setCurrentPage called with page ${page}`);
      setCurrentPage(page);
    },
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
