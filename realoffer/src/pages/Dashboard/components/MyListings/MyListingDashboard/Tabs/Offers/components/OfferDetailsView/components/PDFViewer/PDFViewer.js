// /components/PDFViewer/PDFViewer.js

import React from 'react';
import usePDFViewer from './PDFViewerLogic';
import './PDFViewer.css';

const PDFViewer = ({ isOpen, onClose, fileUrl, docTitle, docType }) => {
  const {
    pdf,
    scale,
    isLoading,
    currentPage,
    isZooming,
    pagesRef,
    containerRef,
    handleZoomIn,
    handleZoomOut,
    handleDownload,
    handleScroll,
    handlePrevPage,
    handleNextPage,
  } = usePDFViewer(fileUrl);

  return (
    isOpen && (
      <div className="offer-details-pdf-viewer-modal">
        <div className="offer-details-pdf-viewer-header">
          <div className="offer-details-pdf-title-container">
            <h2 className="offer-details-pdf-title">{docTitle}</h2>
            <p className="offer-details-pdf-type">{docType}</p>
            <div className="offer-details-title-buttons">
              <button className="offer-details-toolbar-download-button" onClick={handleDownload}>Download</button>
            </div>
          </div>
          <button className="offer-details-pdfviewer-close-button" onClick={onClose}></button>
        </div>
        <div className="offer-details-pdf-viewer-container" onScroll={handleScroll} ref={containerRef}>
          {isLoading && (
            <div className="offer-details-pdf-spinner-overlay">
              <div className="offer-details-pdf-spinner"></div>
            </div>
          )}
          <div className="offer-details-pdf-pages-container">
            {pdf && Array.from(new Array(pdf.numPages), (el, index) => (
              <div key={index} className="offer-details-pdf-page">
                <canvas ref={(el) => (pagesRef.current[index] = { ...pagesRef.current[index], canvas: el })} className="offer-details-pdf-canvas" />
                <div ref={(el) => (pagesRef.current[index] = { ...pagesRef.current[index], textLayer: el })} className="offer-details-pdf-text-layer" />
              </div>
            ))}
          </div>
          {pdf && (
            <div className="offer-details-pdf-float-toolbar">
              <button className="offer-details-toolbar-button" onClick={handlePrevPage} disabled={currentPage <= 1}>
                Previous Page
              </button>
              <span className="offer-details-nav-page-info">
                Page {currentPage} of {pdf.numPages}
              </span>
              <button className="offer-details-toolbar-button" onClick={handleNextPage} disabled={currentPage >= pdf.numPages}>
                Next Page
              </button>
              <button
                className="offer-details-toolbar-button-zoom"
                onClick={handleZoomOut}
                disabled={isZooming || scale <= 0.7}
              >
                -
              </button>
              <button
                className="offer-details-toolbar-button-zoom"
                onClick={handleZoomIn}
                disabled={isZooming || scale >= 3.0}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    )
  );
};

export default PDFViewer;
