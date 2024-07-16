import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker';
import './PDFViewer.css';

const PDFViewer = ({ isOpen, onClose, fileUrl }) => {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (fileUrl) {
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      loadingTask.promise.then(
        (pdfDoc) => {
          setPdf(pdfDoc);
          renderPage(pdfDoc, page, scale);
        },
        (error) => {
          console.error('Error loading PDF:', error);
        }
      );
    }
  }, [fileUrl, page, scale]);

  const renderPage = (pdf, pageNum, scale) => {
    pdf.getPage(pageNum).then((page) => {
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      page.render(renderContext);
    });
  };

  useEffect(() => {
    if (pdf) {
      renderPage(pdf, page, scale);
    }
  }, [pdf, page, scale]);

  const handleZoomIn = () => {
    setScale(scale + 0.1);
  };

  const handleZoomOut = () => {
    setScale(scale - 0.1);
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

  return (
    isOpen && (
      <div className="pdf-viewer-modal">
        <div className="pdf-viewer-header">
          <button className="close-button" onClick={onClose}>× Close</button>
          <div className="pdf-controls">
            <button className="zoom-button" onClick={handleZoomOut}>-</button>
            <button className="zoom-button" onClick={handleZoomIn}>+</button>
            <button className="download-button" onClick={handleDownload}>Download</button>
          </div>
        </div>
        <div className="pdf-viewer-container">
          <canvas ref={canvasRef} className="pdf-canvas" />
          {pdf && (
            <div className="pdf-navigation">
              <button onClick={handlePrevPage} disabled={page <= 1}>
                Previous
              </button>
              <span>
                Page {page} of {pdf.numPages}
              </span>
              <button onClick={handleNextPage} disabled={page >= pdf.numPages}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    )
  );
};

export default PDFViewer;
