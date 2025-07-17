// /src/pages/Dashboard/components/ForBuyers/BuyerPackageDashboard/Tabs/BuyerPackageDocuments/components/PDFViewer/PDFViewer.js

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FiX } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './PDFViewer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewer = ({ fileUrl, docTitle, docType, onClose, buyerPackageId }) => {
  const { token } = useAuth();
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Activity tracking
  useEffect(() => {
    if (fileUrl && buyerPackageId) {
      recordView();
    }
  }, [fileUrl, buyerPackageId]);

  const recordView = async () => {
    if (!buyerPackageId) return;

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/activities`, {
        type: 'view',
        action: 'Viewed document',
        buyerPackage: buyerPackageId,
        metadata: {
          documentTitle: docTitle
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load the document. Please try again.');
    setIsLoading(false);
  };

  const changePage = (offset) => {
    setCurrentPage(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return newPage >= 1 && newPage <= numPages ? newPage : prevPageNumber;
    });
  };

  const zoomIn = () => {
    setScale(prevScale => {
      const newScale = prevScale + 0.2;
      return newScale <= 3 ? newScale : prevScale;
    });
  };

  const zoomOut = () => {
    setScale(prevScale => {
      const newScale = prevScale - 0.2;
      return newScale >= 0.5 ? newScale : prevScale;
    });
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = docTitle || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="pdf-viewer-modal">
      <div className="pdf-viewer-header">
        <div className="pdf-title-container">
          <h2 className="pdf-title">{docTitle}</h2>
          <span className="pdf-type">{docType}</span>
        </div>
        <button className="pdfviewer-close-button" onClick={onClose}>
          <FiX />
        </button>
      </div>
      
      {error && (
        <div className="pdf-error-message">
          {error}
        </div>
      )}
      
      <div className="pdf-viewer-container">
        {isLoading && (
          <div className="pdf-spinner-overlay">
            <div className="pdf-spinner"></div>
          </div>
        )}
        
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
      
      <div className="pdf-toolbar-container visible">
        <div className="pdf-toolbar">
          <button onClick={() => changePage(-1)} disabled={currentPage <= 1}>
            ←
          </button>
          <span className="page-info">
            {currentPage} / {numPages || '?'}
          </span>
          <button onClick={() => changePage(1)} disabled={currentPage >= numPages}>
            →
          </button>
          <button onClick={zoomOut} disabled={scale <= 0.5}>
            -
          </button>
          <button onClick={zoomIn} disabled={scale >= 3}>
            +
          </button>
          <button onClick={handleDownload}>
            ↓
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer; 