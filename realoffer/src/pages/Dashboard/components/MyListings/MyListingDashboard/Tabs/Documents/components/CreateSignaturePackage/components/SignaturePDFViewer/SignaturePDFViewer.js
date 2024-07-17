import React, { useEffect } from 'react';
import useSignaturePDFViewer from './SignaturePDFViewerLogic';
import './SignaturePDFViewer.css';

const SignaturePDFViewer = ({ fileUrl, documentTitle }) => {
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
    handleScroll,
    handlePrevPage,
    handleNextPage,
  } = useSignaturePDFViewer(fileUrl);

  useEffect(() => {
    console.log('PDF fileUrl:', fileUrl);
  }, [fileUrl]);

  return (
    <div className="spv-container">
      <div className="spv-header">
        <button className="spv-select-page-button">Select Page</button>
        <div className="spv-document-title">{documentTitle}</div>
        <div className="spv-toolbar">
          <button className="spv-zoom-button" onClick={handleZoomOut} disabled={isZooming || scale <= 0.7}>
            -
          </button>
          <button className="spv-zoom-button" onClick={handleZoomIn} disabled={isZooming || scale >= 3.0}>
            +
          </button>
        </div>
      </div>
      <div className="spv-body" onScroll={handleScroll} ref={containerRef}>
        {isLoading && <div className="spv-spinner-overlay"><div className="spv-spinner"></div></div>}
        <div className="spv-pages">
          {pdf && Array.from(new Array(pdf.numPages), (el, index) => (
            <div key={index} className="spv-page">
              <canvas ref={(el) => (pagesRef.current[index] = { ...pagesRef.current[index], canvas: el })} className="spv-canvas" />
              <div ref={(el) => (pagesRef.current[index] = { ...pagesRef.current[index], textLayer: el })} className="spv-text-layer" />
            </div>
          ))}
        </div>
      </div>
      <div className="spv-footer">
        <button className="spv-nav-button" onClick={handlePrevPage} disabled={currentPage <= 1}>
          Previous
        </button>
        <span className="spv-page-info">
          Page {currentPage} of {pdf ? pdf.numPages : 0}
        </span>
        <button className="spv-nav-button" onClick={handleNextPage} disabled={currentPage >= (pdf ? pdf.numPages : 0)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default SignaturePDFViewer;
