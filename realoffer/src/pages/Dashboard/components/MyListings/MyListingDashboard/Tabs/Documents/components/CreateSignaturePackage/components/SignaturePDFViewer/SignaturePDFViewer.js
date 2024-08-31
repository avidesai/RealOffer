// SignaturePDFViewer.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { MdSelectAll } from 'react-icons/md';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../../../context/AuthContext';
import SignaturePDFViewerLogic from './SignaturePDFViewerLogic';
import './SignaturePDFViewer.css';

const SignaturePDFViewer = ({ fileUrl, documentTitle, documentId, signaturePackagePages, onPageSelectionChange, onClose }) => {
  const { token } = useAuth();
  const {
    numPages,
    currentPage,
    scale,
    onDocumentLoadSuccess,
    zoomIn,
    zoomOut,
    setCurrentPage,
  } = SignaturePDFViewerLogic({ fileUrl, documentTitle, documentId, onClose });

  const containerRef = useRef(null);
  const pageRefs = useRef({});
  const [localSelectedPages, setLocalSelectedPages] = useState(signaturePackagePages);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setLocalSelectedPages(signaturePackagePages);
  }, [signaturePackagePages]);

  const handlePageSelect = async (pageIndex, isSelected) => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/documents/${isSelected ? 'removePage' : 'addPage'}`;
    const response = await axios.post(url, { documentId, page: pageIndex }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    setLocalSelectedPages((prev) =>
      isSelected ? prev.filter((page) => page !== pageIndex) : [...prev, pageIndex]
    );
    onPageSelectionChange(response.data);
  };


  const handleSelectAllPages = async () => {
    const allPages = Array.from({ length: numPages }, (_, i) => i + 1);
    const currentlySelectedPages = new Set(localSelectedPages);

    await Promise.all(allPages.map(pageIndex => {
      const isSelected = currentlySelectedPages.has(pageIndex);
      return handlePageSelect(pageIndex, isSelected);
    }));

    setLocalSelectedPages(allPages); // Update the local state with all pages selected
  };

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
      className={`spv-pdf-page-container ${localSelectedPages.includes(pageNumber) ? 'selected' : ''}`}
      onClick={() => handlePageSelect(pageNumber, localSelectedPages.includes(pageNumber))}
    >
      <div className="spv-page-wrapper">
        <Page
          pageNumber={pageNumber}
          scale={scale}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          onRenderSuccess={() => {
            alignTextLayer(pageNumber);
            if (pageNumber === numPages) {
              setIsLoading(false);
            }
          }}
          loading={null}
        />
        <div className="spv-overlay">
          <input
            type="checkbox"
            className="spv-checkbox"
            checked={localSelectedPages.includes(pageNumber)}
            onChange={() => handlePageSelect(pageNumber, localSelectedPages.includes(pageNumber))}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      const pageElement = pageRefs.current[newPage];
      
      if (pageElement && containerRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const pageTop = pageElement.getBoundingClientRect().top;
        containerRef.current.scrollTop += pageTop - containerTop;
      }
    }
  };

  return (
    <div className="spv-container">
      <div className="spv-pdf-header">
        <div className="spv-toolbar">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
            <FiChevronLeft />
          </button>
          <span className="spv-page-info">
            {currentPage} / {numPages}
          </span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= numPages}>
            <FiChevronRight />
          </button>
          <button onClick={zoomOut} className="spv-zoom-button" disabled={scale <= 0.6}>
            <FiZoomOut />
          </button>
          <button onClick={zoomIn} className="spv-zoom-button" disabled={scale >= 1.6}>
            <FiZoomIn />
          </button>
          <button onClick={handleSelectAllPages} className="spv-select-all-button">
            <MdSelectAll />
          </button>
        </div>
      </div>
      <div className="spv-body" ref={containerRef}>
        <div className="spv-pdf-viewer-container">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
          >
            {Array.from(new Array(numPages), (el, index) => renderPage(index + 1))}
          </Document>
          {isLoading && (
            <div className="spv-pdf-spinner-overlay">
              <div className="spv-pdf-spinner"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignaturePDFViewer;
