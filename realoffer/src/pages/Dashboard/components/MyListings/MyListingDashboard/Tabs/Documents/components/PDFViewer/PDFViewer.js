import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker';
import './PDFViewer.css';

const PDFViewer = ({ isOpen, onClose, fileUrl, docTitle, docType }) => {
  const [pdf, setPdf] = useState(null);
  const [scale, setScale] = useState(1.7);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const pagesRef = useRef([]);
  const containerRef = useRef(null);

  const MIN_SCALE = 0.7;
  const MAX_SCALE = 3.0;

  const fetchPdf = useCallback(async () => {
    if (fileUrl) {
      setIsLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setIsLoading(false);
      }
    }
  }, [fileUrl]);

  useEffect(() => {
    fetchPdf();
  }, [fetchPdf]);

  const renderPage = async (pageNum) => {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = pagesRef.current[pageNum - 1];
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (error) {
      console.error('Error rendering PDF:', error);
    }
  };

  useEffect(() => {
    const renderAllPages = async () => {
      if (pdf) {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          await renderPage(pageNum);
        }
      }
    };

    renderAllPages();
  }, [pdf, scale]);

  const handleZoomIn = async () => {
    if (scale < MAX_SCALE) {
      setIsZooming(true);
      setScale((prevScale) => prevScale + 0.2);
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulating rendering delay
      setIsZooming(false);
    }
  };

  const handleZoomOut = async () => {
    if (scale > MIN_SCALE) {
      setIsZooming(true);
      setScale((prevScale) => prevScale - 0.2);
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulating rendering delay
      setIsZooming(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScroll = () => {
    if (!pdf) return;

    let closestPage = 1;
    let minDistance = Infinity;

    for (let i = 0; i < pdf.numPages; i++) {
      const canvas = pagesRef.current[i];
      const rect = canvas.getBoundingClientRect();
      const distance = Math.abs(rect.top);

      if (distance < minDistance) {
        minDistance = distance;
        closestPage = i + 1;
      }
    }

    setCurrentPage(closestPage);
  };

  const scrollToPage = (pageNum) => {
    const canvas = pagesRef.current[pageNum - 1];
    if (canvas) {
      canvas.scrollIntoView({ behavior: 'smooth' });
      setCurrentPage(pageNum);
    }
  };

  const handlePrevPage = () => {
    const newPage = Math.max(currentPage - 1, 1);
    setCurrentPage(newPage);
    scrollToPage(newPage);
  };

  const handleNextPage = () => {
    const newPage = Math.min(currentPage + 1, pdf.numPages);
    setCurrentPage(newPage);
    scrollToPage(newPage);
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
              <canvas key={index} ref={(el) => (pagesRef.current[index] = el)} className="pdf-canvas" />
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
                disabled={isZooming || scale <= MIN_SCALE}
              >
                -
              </button>
              <button
                className="toolbar-button-zoom"
                onClick={handleZoomIn}
                disabled={isZooming || scale >= MAX_SCALE}
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
