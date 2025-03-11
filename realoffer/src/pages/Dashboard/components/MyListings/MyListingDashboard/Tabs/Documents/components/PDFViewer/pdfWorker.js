import { pdfjs } from 'react-pdf';

// Initialize the worker once
let isInitialized = false;

/**
 * Initialize the PDF.js worker once for the entire application
 * This prevents multiple worker initializations which can cause conflicts
 */
export const initPdfWorker = () => {
  // Check if the worker is already initialized
  if (!isInitialized) {
    // Set the worker source only if it hasn't been set already
    const workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    console.log('PDF.js worker initialized for Documents PDFViewer');
    isInitialized = true;
  }
};

// Initialize the worker immediately when this module is imported
initPdfWorker();

export default initPdfWorker; 