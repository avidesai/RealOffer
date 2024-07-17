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
      <div className="pdf-viewer-modal">
        <div className="pdf-viewer-header">
          <div className="pdf-title-container">
            <h2 className="pdf-title">{docTitle}</h2>
            <p className="pdf-type">{docType}</p>
            <div className="title-buttons">
              <button className="toolbar-download-button" onClick={handleDownload}>Download</button>
            </div>
          </div>
          <button className="close-button" onClick={onClose}></button>
        </div>
        <div className="pdf-viewer-container" onScroll={handleScroll} ref={containerRef}>
          {isLoading && (
            <div className="pdf-spinner-overlay">
              <div className="pdf-spinner"></div>
            </div>
          )}
          <div className="pdf-pages-container">
            {pdf && Array.from(new Array(pdf.numPages), (el, index) => (
              <div key={index} className="pdf-page">
                <canvas ref={(el) => (pagesRef.current[index] = { ...pagesRef.current[index], canvas: el })} className="pdf-canvas" />
                <div ref={(el) => (pagesRef.current[index] = { ...pagesRef.current[index], textLayer: el })} className="pdf-text-layer" />
              </div>
            ))}
          </div>
          {pdf && (
            <div className="pdf-float-toolbar">
              <button className="toolbar-button" onClick={handlePrevPage} disabled={currentPage <= 1}>
                Previous
              </button>
              <span className="nav-page-info">
                Page {currentPage} of {pdf.numPages}
              </span>
              <button className="toolbar-button" onClick={handleNextPage} disabled={currentPage >= pdf.numPages}>
                Next
              </button>
              <button
                className="toolbar-button-zoom"
                onClick={handleZoomOut}
                disabled={isZooming || scale <= 0.7}
              >
                -
              </button>
              <button
                className="toolbar-button-zoom"
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
