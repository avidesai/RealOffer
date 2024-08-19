import React, { useRef, useEffect, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import SignaturePDFViewerLogic from './SignaturePDFViewerLogic';
import './SignaturePDFViewer.css';

const SignaturePDFViewer = ({ fileUrl, docTitle, docType, onClose }) => {
  const {
    numPages,
    currentPage,
    scale,
    onDocumentLoadSuccess,
    zoomIn,
    zoomOut,
    setCurrentPage,
  } = SignaturePDFViewerLogic({ fileUrl, docTitle, docType, onClose });

  const containerRef = useRef(null);
  const pageRefs = useRef({});

  const alignTextLayer = useCallback((pageNumber) => {
    if (pageRefs.current[pageNumber]) {
      const textLayer = pageRefs.current[pageNumber].querySelector('.react-pdf__Page__textContent');
      if (textLayer) {
        textLayer.style.transform = '';
        textLayer.style.top = '0';
        textLayer.style.left = '0';
        textLayer.style.right = '0';
        textLayer.style.bottom = '0';
      }
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNumber = parseInt(entry.target.dataset.pageNumber, 10);
            setCurrentPage(pageNumber);
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.values(pageRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [numPages, setCurrentPage]);

  const renderPage = (pageNumber) => (
    <div
      key={`page_${pageNumber}`}
      ref={(ref) => (pageRefs.current[pageNumber] = ref)}
      data-page-number={pageNumber}
      className="spv-pdf-page-container"
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={true}
        renderAnnotationLayer={true}
        onRenderSuccess={() => alignTextLayer(pageNumber)}
      />
    </div>
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      pageRefs.current[newPage]?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };

  return (
    <div>
      <div className="spv-pdf-header">
        <div className="spv-pdf-toolbar">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
            <FiChevronLeft />
          </button>
          <span className="spv-page-info">
            {currentPage} / {numPages}
          </span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= numPages}>
            <FiChevronRight />
          </button>
          <button onClick={zoomOut}>
            <FiZoomOut />
          </button>
          <button onClick={zoomIn}>
            <FiZoomIn />
          </button>
        </div>
      </div>
      <div className="spv-pdf-viewer">
        <div
          className="spv-pdf-viewer-container"
          ref={containerRef}
        >
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="spv-pdf-spinner-overlay">
                <div className="spv-pdf-spinner"></div>
              </div>
            }
          >
            {Array.from(new Array(numPages), (el, index) => renderPage(index + 1))}
          </Document>
        </div>
      </div>
    </div>
  );
};

export default SignaturePDFViewer;
