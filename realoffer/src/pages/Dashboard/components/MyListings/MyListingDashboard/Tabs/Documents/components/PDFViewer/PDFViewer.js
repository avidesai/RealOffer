import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker';
import './PDFViewer.css';

const PDFViewer = ({ isOpen, onClose, fileUrl, docTitle, docType }) => {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.7);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const fetchPdf = useCallback(async () => {
    if (fileUrl) {
      setIsLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        await renderPage(pdfDoc, page, scale);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
      setIsLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    fetchPdf();
  }, [fetchPdf]);

  useEffect(() => {
    if (pdf) {
      renderPage(pdf, page, scale);
    }
  }, [pdf, page, scale]);

  const renderPage = async (pdf, pageNum, scale) => {
    setIsLoading(true);
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    renderTaskRef.current = page.render(renderContext);
    await renderTaskRef.current.promise.catch((error) => {
      if (error instanceof pdfjsLib.RenderingCancelledException) {
        console.log('Rendering cancelled:', error.message);
      } else {
        throw error;
      }
    });
    setIsLoading(false);
  };

  const handleZoomIn = () => {
    const newScale = scale + 0.2;
    setScale(newScale);
    console.log('Zoom scale:', newScale);
  };

  const handleZoomOut = () => {
    const newScale = scale - 0.2;
    setScale(newScale);
    console.log('Zoom scale:', newScale);
  };

  const handlePrevPage = () => {
    setPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNextPage = () => {
    setPage((prevPage) => Math.min(prevPage + 1, pdf.numPages));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }
    onClose();
  };

  return (
    isOpen && (
      <div className="pdf-viewer-modal">
        <div className="pdf-viewer-header">
          <div className="pdf-title-container">
            <h2 className="pdf-title">{docTitle}</h2>
            <p className="pdf-type">{docType}</p>
            <div className="title-buttons">
              <button className="toolbar-download-button" onClick={handleDownload}>Download</button>
              <button className="toolbar-print-button" onClick={() => window.print()}>Print</button>
            </div>
          </div>
          <button className="close-button" onClick={handleClose}></button>
        </div>
        <div className="pdf-viewer-container">
          {isLoading && (
            <div className="pdf-spinner-overlay">
              <div className="pdf-spinner"></div>
            </div>
          )}
          <canvas ref={canvasRef} className="pdf-canvas" />
          {pdf && (
            <div className="pdf-float-toolbar">
              <button className="toolbar-button" onClick={handlePrevPage} disabled={page <= 1}>
                Previous
              </button>
              <span className="nav-page-info">
                Page {page} of {pdf.numPages}
              </span>
              <button className="toolbar-button" onClick={handleNextPage} disabled={page >= pdf.numPages}>
                Next
              </button>
              <button className="toolbar-button-zoom" onClick={handleZoomOut}>-</button>
              <button className="toolbar-button-zoom" onClick={handleZoomIn}>+</button>
            </div>
          )}
        </div>
      </div>
    )
  );
};

export default PDFViewer;
