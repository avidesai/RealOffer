// SignaturePDFViewer.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useSignaturePDFViewer from './SignaturePDFViewerLogic';
import './SignaturePDFViewer.css';

const SignaturePDFViewer = ({ fileUrl, documentTitle, documentId, signaturePackagePages, onPageSelectionChange }) => {
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

  const [localSelectedPages, setLocalSelectedPages] = useState(signaturePackagePages);
  const [hoveredPage, setHoveredPage] = useState(null);

  useEffect(() => {
    setLocalSelectedPages(signaturePackagePages);
  }, [signaturePackagePages]);

  const handlePageSelect = async (pageIndex) => {
    const isSelected = localSelectedPages.includes(pageIndex);
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/documents/${isSelected ? 'removePage' : 'addPage'}`;
    setLocalSelectedPages((prev) =>
      prev.includes(pageIndex) ? prev.filter((page) => page !== pageIndex) : [...prev, pageIndex]
    );
    const response = await axios.post(url, { documentId, page: pageIndex });
    onPageSelectionChange(response.data); // Notify parent of the updated document
  };

  const handleMouseEnter = (pageIndex) => {
    setHoveredPage(pageIndex);
  };

  const handleMouseLeave = () => {
    setHoveredPage(null);
  };

  return (
    <div className="spv-container">
      <div className="spv-header">
        <div className="spv-document-title">{documentTitle}</div>
        <div className="spv-toolbar">
          <button className="spv-zoom-button" onClick={handleZoomOut} disabled={isZooming || scale <= 0.6}>
            -
          </button>
          <button className="spv-zoom-button" onClick={handleZoomIn} disabled={isZooming || scale >= 1.6}>
            +
          </button>
        </div>
      </div>
      <div className="spv-body" onScroll={handleScroll} ref={containerRef}>
        {isLoading && <div className="spv-spinner-overlay"><div className="spv-spinner"></div></div>}
        <div className="spv-pages">
          {pdf &&
            Array.from(new Array(pdf.numPages), (el, index) => (
              <div
                key={index}
                className={`spv-page ${localSelectedPages.includes(index + 1) ? 'selected' : ''}`}
                onClick={() => handlePageSelect(index + 1)}
                onMouseEnter={() => handleMouseEnter(index + 1)}
                onMouseLeave={handleMouseLeave}
              >
                <canvas ref={(el) => (pagesRef.current[index] = { ...pagesRef.current[index], canvas: el })} className="spv-canvas" />
                <div ref={(el) => (pagesRef.current[index] = { ...pagesRef.current[index], textLayer: el })} className="spv-text-layer" />
                <div className={`spv-overlay ${hoveredPage === index + 1 || localSelectedPages.includes(index + 1) ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    className="spv-checkbox"
                    checked={localSelectedPages.includes(index + 1)}
                    onChange={() => handlePageSelect(index + 1)}
                    onClick={(e) => e.stopPropagation()} // Prevents click event on the parent div
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
      <div className="spv-footer">
        <button className="spv-nav-button" onClick={handlePrevPage} disabled={currentPage <= 1}>
          Previous Page
        </button>
        <span className="spv-page-info">
          Page {currentPage} of {pdf ? pdf.numPages : 0}
        </span>
        <button className="spv-nav-button" onClick={handleNextPage} disabled={currentPage >= (pdf ? pdf.numPages : 0)}>
          Next Page
        </button>
      </div>
    </div>
  );
};

export default SignaturePDFViewer;
