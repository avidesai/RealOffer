// utils/ocrUtils.js

const { PDFDocument } = require('pdf-lib');
const { createWorker } = require('tesseract.js');

// Helper function to convert PDF page to image
const convertPDFPageToImage = async (pdfBuffer, pageNumber) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const page = pdfDoc.getPage(pageNumber);
    const { width, height } = page.getSize();
    
    // Convert PDF page to image using pdf2pic
    const { fromPath } = require('pdf2pic');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    const tempImagePath = path.join(tempDir, `temp_${Date.now()}_page_${pageNumber}.png`);
    
    // Write PDF buffer to temp file
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    const options = {
      density: 300,
      saveFilename: path.basename(tempImagePath, '.png'),
      savePath: tempDir,
      format: 'png',
      width: Math.round(width * 2.83), // Convert points to pixels
      height: Math.round(height * 2.83)
    };
    
    const convert = fromPath(tempPdfPath, options);
    const pageData = await convert(pageNumber + 1);
    
    // Clean up temp PDF file
    if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    
    return pageData.path;
  } catch (error) {
    console.error('Error converting PDF page to image:', error);
    throw error;
  }
};

// Helper function to extract text from PDF using OCR
const extractTextWithOCR = async (pdfBuffer) => {
  const worker = await createWorker();
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    let fullText = '';

    for (let i = 0; i < pageCount; i++) {
      try {
        // Convert PDF page to image
        const imagePath = await convertPDFPageToImage(pdfBuffer, i);
        
        // Perform OCR on the image
        const { data: { text } } = await worker.recognize(imagePath);
        fullText += text + '\n';
        
        // Clean up temp image file
        const fs = require('fs');
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      } catch (pageError) {
        console.error(`Error processing page ${i}:`, pageError);
        // Continue with next page
      }
    }

    return fullText.trim();
  } finally {
    await worker.terminate();
  }
};

module.exports = {
  extractTextWithOCR
}; 