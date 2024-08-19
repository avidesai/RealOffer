import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut, FiDownload, FiX } from 'react-icons/fi';
import PDFViewerLogic from './PDFViewerLogic';
import './PDFViewer.css';

const PDFViewer = ({ fileUrl, docTitle, docType, onClose }) => {
  console.log('PDFViewer: Component rendering');

  const {
    numPages,
    currentPage,
    scale,
    onDocumentLoadSuccess,
    zoomIn,
    zoomOut,
    handleDownload,
    setCurrentPage,
  } = PDFViewerLogic({ fileUrl, docTitle, docType, onClose });

  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const containerRef = useRef(null);
  const pageRefs = useRef({});
  const toolbarTimeoutRef = useRef(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const alignTextLayer = useCallback((pageNumber) => {
    console.log(`PDFViewer: Aligning text layer for page ${pageNumber}`);
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
    console.log('PDFViewer: Setting up Intersection Observer');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInitialLoad) {
            const pageNumber = parseInt(entry.target.dataset.pageNumber, 10);
            console.log(`PDFViewer: Page ${pageNumber} is intersecting, updating currentPage`);
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
  }, [numPages, setCurrentPage, isInitialLoad]);

  useEffect(() => {
    console.log('PDFViewer: fileUrl changed, resetting to initial state');
    setIsInitialLoad(true);
    setCurrentPage(1);
  }, [fileUrl, setCurrentPage]);

  const renderPage = (pageNumber) => (
    <div
      key={`page_${pageNumber}`}
      ref={(ref) => (pageRefs.current[pageNumber] = ref)}
      data-page-number={pageNumber}
      className="pdf-page-container"
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
    console.log(`PDFViewer: handlePageChange called with newPage ${newPage}`);
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      pageRefs.current[newPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const showToolbar = () => {
    setIsToolbarVisible(true);
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
  };

  const hideToolbarWithDelay = () => {
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
    toolbarTimeoutRef.current = setTimeout(() => {
      setIsToolbarVisible(false);
    }, 3000);
  };

  const forceInitialPage = useCallback(() => {
    console.log('PDFViewer: forceInitialPage called');
    setCurrentPage(1);
    setIsInitialLoad(false);
    if (pageRefs.current[1]) {
      pageRefs.current[1].scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [setCurrentPage]);

  useEffect(() => {
    console.log(`PDFViewer: currentPage changed to ${currentPage}`);
  }, [currentPage]);

  return (
    <div className="pdf-viewer-modal">
      <div className="pdf-viewer-header">
        <div className="pdf-title-container">
          <h2 className="pdf-title">{docTitle}</h2>
          <p className="pdf-type">{docType}</p>
        </div>
        <button className="pdfviewer-close-button" onClick={onClose}>
          <FiX />
        </button>
      </div>
      <div 
        className="pdf-viewer-container" 
        ref={containerRef}
        onMouseMove={showToolbar}
        onMouseLeave={hideToolbarWithDelay}
      >
        <Document
          file={fileUrl}
          onLoadSuccess={(info) => {
            console.log('PDFViewer: Document loaded successfully');
            onDocumentLoadSuccess(info);
            forceInitialPage();
          }}
          loading={
            <div className="pdf-spinner-overlay">
              <div className="pdf-spinner"></div>
            </div>
          }
        >
          {Array.from(new Array(numPages), (el, index) => renderPage(index + 1))}
        </Document>
      </div>
      <div
        className={`pdf-toolbar-container ${isToolbarVisible ? 'visible' : ''}`}
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbarWithDelay}
      >
        <div className="pdf-toolbar">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
            <FiChevronLeft />
          </button>
          <span className="page-info">
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
          <button onClick={handleDownload}>
            <FiDownload />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;