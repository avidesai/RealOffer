// Improved document text extraction utility
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

class DocumentTextExtractor {
  constructor() {
    this.ocrWorker = null;
  }

  async initializeOCR() {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker();
    }
    return this.ocrWorker;
  }

  async terminateOCR() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }

  /**
   * Enhanced PDF text extraction with better OCR handling
   */
  async extractTextFromPDF(pdfBuffer, options = {}) {
    const { 
      useOCRFallback = true, 
      minTextLength = 100,
      ocrLanguage = 'eng',
      enhanceImages = true 
    } = options;

    try {
      // First attempt: Standard PDF text extraction
      console.log('📄 Attempting standard PDF text extraction...');
      const pdfData = await pdfParse(pdfBuffer);
      const extractedText = pdfData.text;

      // Check if we got meaningful text
      if (extractedText && extractedText.trim().length >= minTextLength) {
        console.log(`✅ Standard extraction successful: ${extractedText.length} characters`);
        return {
          text: extractedText,
          method: 'standard',
          pages: pdfData.numpages,
          metadata: pdfData.metadata
        };
      }

      // If standard extraction failed or yielded poor results, try OCR
      if (useOCRFallback) {
        console.log('🔄 Standard extraction insufficient, attempting OCR...');
        return await this.extractTextWithOCR(pdfBuffer, { 
          language: ocrLanguage, 
          enhanceImages 
        });
      }

      return {
        text: extractedText || '',
        method: 'standard',
        pages: pdfData.numpages || 0,
        warning: 'Low text content extracted'
      };

    } catch (error) {
      console.error('❌ Standard PDF extraction failed:', error.message);
      
      if (useOCRFallback) {
        console.log('🔄 Falling back to OCR due to extraction error...');
        return await this.extractTextWithOCR(pdfBuffer, { 
          language: ocrLanguage, 
          enhanceImages 
        });
      }
      
      throw error;
    }
  }

  /**
   * Enhanced OCR with image preprocessing
   */
  async extractTextWithOCR(pdfBuffer, options = {}) {
    const { language = 'eng', enhanceImages = true } = options;
    
    const worker = await this.initializeOCR();
    let fullText = '';
    let processedPages = 0;

    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      console.log(`🔍 Starting OCR on ${pageCount} pages...`);

      for (let i = 0; i < pageCount; i++) {
        try {
          console.log(`📖 Processing page ${i + 1}/${pageCount}...`);
          
          // Convert PDF page to image
          let imageBuffer = await this.convertPDFPageToImage(pdfBuffer, i);
          
          // Enhance image for better OCR if enabled
          if (enhanceImages) {
            imageBuffer = await this.enhanceImageForOCR(imageBuffer);
          }
          
          // Perform OCR
          const { data: { text, confidence } } = await worker.recognize(imageBuffer, {
            lang: language,
            tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
            tessedit_ocr_engine_mode: '2' // Use LSTM engine
          });
          
          if (text && text.trim().length > 10) {
            fullText += `\n--- PAGE ${i + 1} ---\n${text}\n`;
            processedPages++;
            console.log(`✅ Page ${i + 1}: ${text.length} chars (confidence: ${Math.round(confidence)}%)`);
          } else {
            console.log(`⚠️ Page ${i + 1}: No meaningful text extracted`);
          }
          
        } catch (pageError) {
          console.error(`❌ Error processing page ${i + 1}:`, pageError.message);
          fullText += `\n--- PAGE ${i + 1}: ERROR PROCESSING ---\n`;
        }
      }

      return {
        text: fullText,
        method: 'ocr',
        pages: pageCount,
        processedPages: processedPages,
        language: language
      };

    } finally {
      // Don't terminate here, keep worker alive for potential reuse
    }
  }

  /**
   * Convert PDF page to image buffer
   */
  async convertPDFPageToImage(pdfBuffer, pageIndex) {
    // This is a simplified version - you might want to use pdf2pic or similar library
    // For now, we'll use a basic implementation
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const { promisify } = require('util');
    
    const execAsync = promisify(exec);
    const tempDir = '/tmp';
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    const tempImagePath = path.join(tempDir, `temp_${Date.now()}_page_${pageIndex}.png`);
    
    try {
      // Write PDF to temp file
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      
      // Convert using ImageMagick (if available) or pdftoppm
      await execAsync(`convert "${tempPdfPath}[${pageIndex}]" -density 300 -quality 100 "${tempImagePath}"`);
      
      // Read the generated image
      const imageBuffer = fs.readFileSync(tempImagePath);
      
      // Cleanup
      fs.unlinkSync(tempPdfPath);
      fs.unlinkSync(tempImagePath);
      
      return imageBuffer;
      
    } catch (error) {
      console.error('Image conversion failed:', error.message);
      // Cleanup on error
      try {
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError.message);
      }
      throw error;
    }
  }

  /**
   * Enhance image for better OCR results
   */
  async enhanceImageForOCR(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .normalize() // Normalize contrast
        .sharpen() // Sharpen the image
        .threshold(128) // Convert to black and white
        .png()
        .toBuffer();
    } catch (error) {
      console.warn('Image enhancement failed, using original:', error.message);
      return imageBuffer;
    }
  }

  /**
   * Extract text from various document types
   */
  async extractTextFromDocument(buffer, documentType = 'pdf', options = {}) {
    const type = documentType.toLowerCase();
    
    switch (type) {
      case 'pdf':
        return await this.extractTextFromPDF(buffer, options);
      
      case 'docx':
        // Could implement DOCX extraction here
        throw new Error('DOCX extraction not yet implemented');
      
      case 'txt':
        return {
          text: buffer.toString('utf-8'),
          method: 'direct',
          pages: 1
        };
      
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
  }
}

module.exports = DocumentTextExtractor;