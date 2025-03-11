import { pdfjs } from 'react-pdf';

let isInitialized = false;

export const initPdfWorker = () => {
  if (!isInitialized) {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    console.log('Global PDF.js worker initialized.');
    isInitialized = true;
  }
};

// Initialize immediately
initPdfWorker();

export default initPdfWorker; 