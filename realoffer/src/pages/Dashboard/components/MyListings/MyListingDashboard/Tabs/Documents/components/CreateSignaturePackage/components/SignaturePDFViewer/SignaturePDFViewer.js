import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { MdSelectAll } from 'react-icons/md';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../../../context/AuthContext';
import SignaturePDFViewerLogic from './SignaturePDFViewerLogic';
import './SignaturePDFViewer.css';
import { throttle } from 'lodash';

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
  const [renderedPages, setRenderedPages] = useState([1]); // Start by rendering the first page

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

  const handleScroll = useCallback(
    throttle(() => {
      const container = containerRef.current;
      if (container) {
        const { scrollTop, clientHeight, scrollHeight } = container;
        const totalPages = Math.ceil(numPages);
        const threshold = 200;

        // Load next batch of pages when close to bottom
        if (scrollTop + clientHeight + threshold >= scrollHeight && renderedPages.length < totalPages) {
          setRenderedPages((prev) => {
            const nextPages = Array.from({ length: 5 }, (_, i) => prev.length + i + 1);
            return [...prev, ...nextPages].slice(0, totalPages);
          });
        }

        // Unmount pages that are too far from the current viewport
        const startPage = Math.max(1, Math.floor(scrollTop / clientHeight) - 5);
        const endPage = Math.min(numPages, Math.ceil((scrollTop + clientHeight) / clientHeight) + 5);
        setRenderedPages(Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i));
      }
    }, 300), // 300ms throttle for scroll
    [numPages, renderedPages]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

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
            if (pageNumber === 1) {
              setIsLoading(false); // Hide spinner once the first page is rendered
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
            {renderedPages.map(pageNumber => renderPage(pageNumber))}
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
