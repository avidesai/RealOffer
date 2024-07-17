import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker';

const usePDFViewer = (fileUrl) => {
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
      const canvas = pagesRef.current[pageNum - 1].canvas;
      const textLayer = pagesRef.current[pageNum - 1].textLayer;
      const context = canvas.getContext('2d');
      
      // Adjust the scale factor for higher DPI rendering
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";

      const transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0]
        : null;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        transform: transform,
      };

      await page.render(renderContext).promise;

      const textContent = await page.getTextContent();
      pdfjsLib.renderTextLayer({
        textContent,
        container: textLayer,
        viewport,
        textDivs: [],
        enhanceTextSelection: true, // Enables text selection
      });
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
      await new Promise((resolve) => setTimeout(resolve, 150)); // Simulating rendering delay
      setIsZooming(false);
    }
  };

  const handleZoomOut = async () => {
    if (scale > MIN_SCALE) {
      setIsZooming(true);
      setScale((prevScale) => prevScale - 0.2);
      await new Promise((resolve) => setTimeout(resolve, 150)); // Simulating rendering delay
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
      const canvas = pagesRef.current[i].canvas;
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
    const canvas = pagesRef.current[pageNum - 1].canvas;
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

  return {
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
  };
};

export default usePDFViewer;
