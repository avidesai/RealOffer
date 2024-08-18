import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut, FiDownload, FiX } from 'react-icons/fi';
import PDFViewerLogic from './PDFViewerLogic';
import './PDFViewer.css';

const PDFViewer = ({ fileUrl, docTitle, docType, onClose }) => {
  const {
    numPages,
    currentPage,
    scale,
    onDocumentLoadSuccess,
    changePage,
    zoomIn,
    zoomOut,
    handleDownload,
  } = PDFViewerLogic({ fileUrl, docTitle, docType, onClose });

  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const containerRef = useRef(null);
  const pageRef = useRef(null);

  const adjustPagePosition = () => {
    if (containerRef.current && pageRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const canvas = pageRef.current.querySelector('canvas');
      if (canvas) {
        const pageWidth = canvas.offsetWidth;
        if (pageWidth > containerWidth) {
          pageRef.current.style.transform = `translateX(${(containerWidth - pageWidth) / 2}px)`;
        } else {
          pageRef.current.style.transform = 'none';
        }
      }
    }
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(adjustPagePosition);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    adjustPagePosition();
  }, [scale, currentPage]);

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
      <div className="pdf-viewer-container" ref={containerRef}>
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="pdf-spinner-overlay">
              <div className="pdf-spinner"></div>
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            inputRef={pageRef}
            onRenderSuccess={adjustPagePosition}
          />
        </Document>
      </div>
      <div
        className="pdf-toolbar-container"
        onMouseEnter={() => setIsToolbarVisible(true)}
        onMouseLeave={() => setIsToolbarVisible(false)}
      >
        <div className={`pdf-toolbar ${isToolbarVisible ? 'visible' : ''}`}>
          <button onClick={() => changePage(-1)} disabled={currentPage <= 1}>
            <FiChevronLeft />
          </button>
          <span className="page-info">
            {currentPage} / {numPages}
          </span>
          <button onClick={() => changePage(1)} disabled={currentPage >= numPages}>
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