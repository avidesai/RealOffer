// controllers/DocumentController.js

const Document = require('../models/Document');
const PropertyListing = require('../models/PropertyListing');
const Offer = require('../models/Offer');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument, ParseSpeeds } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const { extractTextFromPDF } = require('./DocumentAnalysisController');
const optimizedDocumentProcessor = require('../utils/optimizedDocumentProcessor');
const { deleteDocumentEmbeddingsFromPinecone, deletePropertyEmbeddingsFromPinecone } = require('../utils/vectorStore');
const Anthropic = require('@anthropic-ai/sdk');
const { fromPath } = require('pdf2pic');
const imagemagick = require('imagemagick');
const fs = require('fs');
const path = require('path');
const os = require('os');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
    files: 30 // Maximum number of files
  }
});

exports.uploadDocuments = upload.array('documents', 30);

// Helper function to check if PDF is corrupted using pdf-parse
const isPdfCorrupted = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return false; // PDF is not corrupted
  } catch (error) {
    console.warn('PDF appears to be corrupted:', error.message);
    return true; // PDF is corrupted
  }
};

// Helper function to extract a single page using image-based conversion
const attemptSinglePageImageExtraction = async (document, existingPdfBytes, pageNumber, mergedPdf) => {
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp_single_page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
  
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write PDF to temp file for pdf2pic
    fs.writeFileSync(tempPdfPath, Buffer.from(existingPdfBytes));
    
    // Verify file was written
    if (!fs.existsSync(tempPdfPath)) {
      throw new Error('Failed to write temporary PDF file');
    }
    
    // Convert specific page to image
    const convert = fromPath(tempPdfPath, {
      density: 200,
      saveFilename: "page",
      savePath: tempDir,
      format: "png",
      width: 2000,
      height: 2600
    });
    
    // Convert the specific page to image
    const result = await convert(pageNumber, { responseType: "buffer" });
    
    if (result && result.buffer) {
      // Create a new PDF page from the image
      const imagePdf = await PDFDocument.create();
      const pngImage = await imagePdf.embedPng(result.buffer);
      const page = imagePdf.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });
      
      // Copy this page to the merged PDF
      const [copiedPage] = await mergedPdf.copyPages(imagePdf, [0]);
      mergedPdf.addPage(copiedPage);
    } else {
      throw new Error('Failed to convert page to image');
    }
  } catch (error) {
    console.error(`Image extraction failed for page ${pageNumber} of ${document.title}:`, error.message);
    throw error;
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp file ${tempPdfPath}:`, cleanupError.message);
    }
  }
};

// Helper function to convert a page using ImageMagick directly
const convertPageWithImageMagick = async (pdfPath, pageNumber) => {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputImagePath = path.join(tempDir, `page_${Date.now()}_${pageNumber}.png`);
    
    // Use ImageMagick to convert specific page to PNG
    const args = [
      `${pdfPath}[${pageNumber - 1}]`, // PDF file with page index (0-based)
      '-density', '450',              // Optimal DPI for text clarity without excessive size
      '-quality', '100',              // Maximum quality (no compression)
      '-alpha', 'remove',             // Remove transparency
      '-background', 'white',         // White background
      '-colorspace', 'RGB',           // Ensure RGB color space
      '-compress', 'None',            // No compression for maximum quality
      '-type', 'TrueColor',           // Force full color depth
      '-depth', '8',                  // 8-bit depth for crisp rendering
      '-define', 'pdf:use-cropbox=true', // Use PDF crop box for better rendering
      '-define', 'pdf:use-trimbox=true', // Use PDF trim box
      '-define', 'pdf:fit-page=true', // Fit page properly
      '-antialias',                   // Enable antialiasing for smooth text edges
      '-sharpen', '0x1.0',           // More aggressive sharpening for text
      '-enhance',                     // Enhance contrast and clarity
      '-normalize',                   // Normalize contrast for better readability
      outputImagePath
    ];
    
    console.log(`Running ImageMagick: convert ${args.join(' ')}`);
    
    // Use the imagemagick module directly (more reliable than spawning processes)
    imagemagick.convert(args, (err, stdout) => {
      if (err) {
        console.error(`ImageMagick module conversion failed:`, err);
        console.error(`Command was: convert ${args.join(' ')}`);
        
        // Try alternative approach for better text rendering
        console.log('Trying alternative ImageMagick settings for better text...');
        const alternativeArgs = [
          `${pdfPath}[${pageNumber - 1}]`,
          '-density', '300',
          '-quality', '100',
          '-alpha', 'remove',
          '-background', 'white',
          '-colorspace', 'sRGB',
          '-compress', 'None',
          '-strip',                     // Remove all profiles and comments
          '-trim',                      // Trim whitespace
          '+repage',                    // Reset page geometry
          '-unsharp', '0x0.75+0.75+0.008', // Unsharp mask for text clarity
          outputImagePath
        ];
        
        imagemagick.convert(alternativeArgs, async (altErr, altStdout) => {
          if (altErr) {
            console.error(`Alternative ImageMagick conversion also failed:`, altErr);
            // If ImageMagick is blocked by policy for PDFs, try Ghostscript as a last resort
            const errMsg = String(altErr?.message || err?.message || '').toLowerCase();
            if (errMsg.includes('not allowed by the security policy') || errMsg.includes('iscoderauthorized')) {
              try {
                const { exec } = require('child_process');
                const util = require('util');
                const execAsync = util.promisify(exec);
                const gsOutPath = outputImagePath; // same path
                const gsCmd = `gs -sDEVICE=png16m -dSAFER -dNOPAUSE -dBATCH -r300 -dFirstPage=${pageNumber} -dLastPage=${pageNumber} -o "${gsOutPath}" "${pdfPath}"`;
                await execAsync(gsCmd);
                handleImageMagickSuccess();
                return;
              } catch (gsErr) {
                console.error('Ghostscript image rendering also failed:', gsErr);
              }
            }
            resolve(null);
            return;
          }
          console.log(`Alternative ImageMagick succeeded:`, altStdout);
          handleImageMagickSuccess();
        });
        return;
      }
      
      console.log(`ImageMagick stdout:`, stdout);
      handleImageMagickSuccess();
    });
    
    const handleImageMagickSuccess = () => {
      try {
        if (fs.existsSync(outputImagePath)) {
          const imageBuffer = fs.readFileSync(outputImagePath);
          // Clean up temp image file
          fs.unlinkSync(outputImagePath);
          console.log(`ImageMagick successfully converted page ${pageNumber}, buffer size: ${imageBuffer.length}`);
          resolve(imageBuffer);
        } else {
          console.error(`ImageMagick output file not found: ${outputImagePath}`);
          resolve(null);
        }
      } catch (readError) {
        console.error(`Error reading ImageMagick output:`, readError);
        resolve(null);
      }
    };
  });
};

// HELPER FUNCTION: Attempt to remove permission restrictions using qpdf/ghostscript if available, else pdf-lib
const removePasswordRestrictions = async (pdfBytes, documentTitle) => {
  try {
    // Convert ArrayBuffer to Buffer if necessary
    let pdfBuffer;
    if (pdfBytes instanceof ArrayBuffer) {
      pdfBuffer = Buffer.from(pdfBytes);
    } else if (Buffer.isBuffer(pdfBytes)) {
      pdfBuffer = pdfBytes;
    } else {
      pdfBuffer = Buffer.from(pdfBytes);
    }

    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `restricted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
    const qpdfOutputPath = path.join(tempDir, `unrestricted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
    const gsOutputPath = path.join(tempDir, `gs_unrestricted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);

    // Write input
    try {
      fs.writeFileSync(inputPath, pdfBuffer);
    } catch (e) {
      console.log(`${documentTitle}: Failed to write temp input file: ${e.message}`);
    }

    // Try qpdf if present
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      console.log(`${documentTitle}: Attempting qpdf --decrypt...`);
      await execAsync(`qpdf --decrypt "${inputPath}" "${qpdfOutputPath}"`);
      if (fs.existsSync(qpdfOutputPath) && fs.statSync(qpdfOutputPath).size > 0) {
        const unrestricted = fs.readFileSync(qpdfOutputPath);
        try { fs.unlinkSync(inputPath); } catch (_) {}
        try { fs.unlinkSync(qpdfOutputPath); } catch (_) {}
        console.log(`${documentTitle}: qpdf succeeded (${unrestricted.length} bytes)`);
        return unrestricted;
      }
      console.log(`${documentTitle}: qpdf produced no output, trying ghostscript...`);
    } catch (qerr) {
      console.log(`${documentTitle}: qpdf not available or failed: ${qerr.message}`);
    }

    // Try ghostscript to rewrite and strip permissions (owner password)
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      console.log(`${documentTitle}: Attempting Ghostscript rewrite...`);
      // -dPDFSETTINGS is optional; this command rewrites PDF and often drops permission bits
      const gsCmd = `gs -o "${gsOutputPath}" -sDEVICE=pdfwrite -dSAFER -dNOPAUSE -dBATCH "${inputPath}"`;
      await execAsync(gsCmd);
      if (fs.existsSync(gsOutputPath) && fs.statSync(gsOutputPath).size > 0) {
        const unrestricted = fs.readFileSync(gsOutputPath);
        try { fs.unlinkSync(inputPath); } catch (_) {}
        try { fs.unlinkSync(gsOutputPath); } catch (_) {}
        console.log(`${documentTitle}: Ghostscript succeeded (${unrestricted.length} bytes)`);
        return unrestricted;
      }
      console.log(`${documentTitle}: Ghostscript produced no output, falling back to pdf-lib...`);
    } catch (gserr) {
      console.log(`${documentTitle}: Ghostscript not available or failed: ${gserr.message}`);
    }

    // Cleanup temp inputs from CLI branch
    try { fs.unlinkSync(inputPath); } catch (_) {}
    try { fs.unlinkSync(qpdfOutputPath); } catch (_) {}
    try { fs.unlinkSync(gsOutputPath); } catch (_) {}

    // pdf-lib bypass methods
    console.log(`${documentTitle}: Attempting to bypass PDF restrictions using pdf-lib ignoreEncryption...`);

    // Method 1: Try to load with ignoreEncryption and copy pages to new PDF
    try {
      const restrictedPdf = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
        updateMetadata: false,
        parseSpeed: ParseSpeeds.Fastest
      });

      console.log(`${documentTitle}: Successfully loaded restricted PDF with ignoreEncryption`);

      // Try different approaches to access page information
      let pageCount = 0;
      let pages = [];

      // Try multiple methods to get page count
      try {
        pageCount = restrictedPdf.getPageCount();
        console.log(`${documentTitle}: Page count via getPageCount(): ${pageCount}`);
      } catch (pageCountError) {
        console.log(`${documentTitle}: getPageCount() failed, trying alternative methods`);

        // Try to access pages directly
        try {
          pages = restrictedPdf.getPages();
          pageCount = pages.length;
          console.log(`${documentTitle}: Page count via getPages().length: ${pageCount}`);
        } catch (getPagesError) {
          console.log(`${documentTitle}: getPages() also failed, trying catalog inspection`);

          // Last resort: try to inspect the PDF catalog structure
          try {
            const catalog = restrictedPdf.catalog;
            if (catalog && catalog.Pages) {
              pageCount = 3; // Conservative estimate
              console.log(`${documentTitle}: Using estimated page count: ${pageCount}`);
            }
          } catch (_) {
            // ignore
          }
        }
      }

      if (pageCount > 0) {
        try {
          const unrestrictedPdf = await PDFDocument.create();
          let successfulPages = 0;
          for (let i = 0; i < pageCount; i++) {
            try {
              const [copiedPage] = await unrestrictedPdf.copyPages(restrictedPdf, [i]);
              unrestrictedPdf.addPage(copiedPage);
              successfulPages++;
              console.log(`${documentTitle}: Successfully copied page ${i + 1}`);
            } catch (pageError) {
              console.log(`${documentTitle}: Failed to copy page ${i + 1}: ${pageError.message}`);
            }
          }

          if (successfulPages > 0) {
            const unrestrictedBytes = await unrestrictedPdf.save();
            console.log(`${documentTitle}: Successfully bypassed PDF restrictions - copied ${successfulPages}/${pageCount} pages (${unrestrictedBytes.length} bytes)`);
            return Buffer.from(unrestrictedBytes);
          }
        } catch (copyError) {
          console.log(`${documentTitle}: Page copying process failed: ${copyError.message}`);
        }
      }
    } catch (method1Error) {
      console.log(`${documentTitle}: Method 1 (page copying) failed - ${method1Error.message}`);
    }

    // Method 2: Try alternative save approaches to strip restrictions
    try {
      console.log(`${documentTitle}: Attempting method 2 - alternative save approaches...`);

      const restrictedPdf = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
        updateMetadata: false
      });

      const saveConfigs = [
        { useObjectStreams: false, addDefaultPage: false, compress: false },
        { useObjectStreams: true, addDefaultPage: false },
        {}
      ];

      for (let i = 0; i < saveConfigs.length; i++) {
        try {
          console.log(`${documentTitle}: Trying save config ${i + 1}...`);
          const cleanedBytes = await restrictedPdf.save(saveConfigs[i]);
          try {
            const testCleanPdf = await PDFDocument.load(cleanedBytes);
            const cleanPageCount = testCleanPdf.getPageCount();
            if (cleanPageCount > 0) {
              console.log(`${documentTitle}: Successfully bypassed PDF restrictions using save config ${i + 1} (${cleanedBytes.length} bytes)`);
              return Buffer.from(cleanedBytes);
            }
          } catch (_) {
            console.log(`${documentTitle}: Save config ${i + 1} still produces encrypted PDF`);
          }
        } catch (saveErr) {
          console.log(`${documentTitle}: Save config ${i + 1} failed: ${saveErr.message}`);
        }
      }
    } catch (method2Error) {
      console.log(`${documentTitle}: Method 2 (save stripping) failed - ${method2Error.message}`);
    }

    console.log(`${documentTitle}: All PDF restriction bypass methods failed, will use image conversion`);
    return null;

  } catch (error) {
    console.error(`${documentTitle}: Error in restriction removal process - ${error.message}`);
    return null;
  }
};

// HELPER FUNCTION: Check if PDF has restrictions and attempt removal
const checkIfPasswordProtected = async (pdfBytes, documentTitle) => {
  try {
    // Try to load with pdf-lib first (most restrictive)
    await PDFDocument.load(pdfBytes, { 
      updateMetadata: false,
      parseSpeed: ParseSpeeds.Fastest
    });
    
    // If that succeeds, try to get page count (this often fails on protected PDFs)
    const testPdf = await PDFDocument.load(pdfBytes);
    const pageCount = testPdf.getPageCount();
    
    if (pageCount === 0) {
      console.log(`${documentTitle}: Page count is 0, likely password-protected`);
      return true;
    }
    
    // Try to access the first page (this tests for content access restrictions)
    const pages = testPdf.getPages();
    if (pages.length === 0) {
      console.log(`${documentTitle}: Cannot access pages, likely password-protected`);
      return true;
    }
    
    console.log(`${documentTitle}: Successfully loaded and analyzed, not password-protected`);
    return false;
    
  } catch (error) {
    const errorMessage = error.message.toLowerCase();
    
    // Check for specific password/security-related errors
    if (errorMessage.includes('password') || 
        errorMessage.includes('encrypted') ||
        errorMessage.includes('security') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('pdfdict') ||
        errorMessage.includes('invalid object') ||
        errorMessage.includes('parse invalid') ||
        errorMessage.includes('crypt') ||
        errorMessage.includes('filter')) {
      console.log(`${documentTitle}: Detected password protection - ${error.message}`);
      return true;
    }
    
    // For other errors, assume it's password-protected to be safe
    console.log(`${documentTitle}: Unknown PDF error, treating as password-protected - ${error.message}`);
    return true;
  }
};

// MAIN FUNCTION: Smart PDF processing with restriction bypass
const convertSelectedPagesToImages = async (document, existingPdfBytes, mergedPdf, processingErrors, processingInfo, progressCallback) => {
  // First, check if this is a password-protected PDF
  const isPasswordProtected = await checkIfPasswordProtected(existingPdfBytes, document.title);
  
  if (isPasswordProtected) {
    console.log(`${document.title} has restrictions, attempting to bypass...`);
    if (progressCallback) {
      progressCallback(`${document.title} has security restrictions - attempting to bypass for better quality...`);
    }
    
    // Try to remove permission restrictions (works for owner passwords, not user passwords)
    const unrestrictedBytes = await removePasswordRestrictions(existingPdfBytes, document.title);
    
    if (unrestrictedBytes) {
      console.log(`${document.title}: Successfully bypassed restrictions, using vector copying!`);
      if (progressCallback) {
        progressCallback(`${document.title}: Bypassed restrictions - using high-quality vector copying...`);
      }
      
      // Try to process the unrestricted PDF with direct copying
      try {
        const unrestrictedPdf = await PDFDocument.load(unrestrictedBytes, { 
          updateMetadata: false,
          parseSpeed: ParseSpeeds.Fastest
        });
        
        const sortedPageNumbers = [...document.signaturePackagePages].sort((a, b) => a - b);
        
        for (const pageNumber of sortedPageNumbers) {
          if (progressCallback) {
            progressCallback(`Copying page ${pageNumber} of ${document.title} (vector quality restored)...`);
          }
          
          const pageIndex = pageNumber - 1;
          if (pageIndex >= 0 && pageIndex < unrestrictedPdf.getPageCount()) {
            const [copiedPage] = await mergedPdf.copyPages(unrestrictedPdf, [pageIndex]);
            mergedPdf.addPage(copiedPage);
            console.log(`Successfully copied page ${pageNumber} from ${document.title} with restored vector quality`);
          }
        }
        
        // Add success message to processing info (not an error, just informational)
        const successMsg = `${document.title}: Password protection removed successfully`;
        processingInfo.push(successMsg);
        
        return; // Success with bypassed restrictions
      } catch (error) {
        console.warn(`${document.title}: Even after restriction removal, direct copying failed:`, error.message);
        // Fall back to image conversion using the unrestricted PDF
        return await convertDocumentToImages(document, unrestrictedBytes, mergedPdf, processingErrors, progressCallback);
      }
    } else {
      console.log(`${document.title}: Could not bypass restrictions, using enhanced image conversion`);
      if (progressCallback) {
        progressCallback(`${document.title}: Restrictions could not be bypassed - using enhanced image conversion...`);
      }
      
      // Add informational message to processing info (not really an error, just info)
      const infoMsg = `${document.title}: Converted to images for compatibility`;
      processingInfo.push(infoMsg);
      
      // Skip direct copying and go straight to image conversion for password-protected PDFs
      return await convertDocumentToImages(document, existingPdfBytes, mergedPdf, processingErrors, progressCallback);
    }
  }
  
  // For non-protected PDFs, try direct PDF page copying (preserves vector quality)
  try {
    const existingPdf = await PDFDocument.load(existingPdfBytes, { 
      updateMetadata: false,
      parseSpeed: ParseSpeeds.Fastest
    });
    
    const sortedPageNumbers = [...document.signaturePackagePages].sort((a, b) => a - b);
    
    for (const pageNumber of sortedPageNumbers) {
      try {
        if (progressCallback) {
          progressCallback(`Copying page ${pageNumber} of ${document.title} (preserving vector quality)...`);
        }
        
        const pageIndex = pageNumber - 1;
        if (pageIndex >= 0 && pageIndex < existingPdf.getPageCount()) {
          const [copiedPage] = await mergedPdf.copyPages(existingPdf, [pageIndex]);
          mergedPdf.addPage(copiedPage);
          console.log(`Successfully copied page ${pageNumber} from ${document.title} with vector quality`);
        } else {
          throw new Error(`Page ${pageNumber} is out of range`);
        }
      } catch (pageError) {
        console.warn(`Direct copy failed for page ${pageNumber} of ${document.title}, falling back to image conversion`);
        // If direct copy fails, fall back to image conversion for this page
        await convertSinglePageToImage(document, existingPdfBytes, mergedPdf, pageNumber, progressCallback);
      }
    }
    
    return; // Success with direct copying
  } catch (error) {
    console.warn(`Direct PDF copying failed for ${document.title}, falling back to image conversion:`, error.message);
    // Fall back to the image conversion method
    return await convertDocumentToImages(document, existingPdfBytes, mergedPdf, processingErrors, progressCallback);
  }
};

// HELPER FUNCTION: Convert a single page to image (for fallback)
const convertSinglePageToImage = async (document, existingPdfBytes, mergedPdf, pageNumber, progressCallback) => {
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp_single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
  
  try {
    fs.writeFileSync(tempPdfPath, Buffer.from(existingPdfBytes));
    
    if (progressCallback) {
      progressCallback(`Converting page ${pageNumber} of ${document.title} to high-quality image (fallback)...`);
    }
    
    const imageBuffer = await convertPageWithImageMagick(tempPdfPath, pageNumber);
    if (imageBuffer) {
      const imagePdf = await PDFDocument.create();
      const pngImage = await imagePdf.embedPng(imageBuffer);
      const page = imagePdf.addPage([pngImage.width, pngImage.height]);
      
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });
      
      const [copiedPage] = await mergedPdf.copyPages(imagePdf, [0]);
      mergedPdf.addPage(copiedPage);
      console.log(`Successfully converted page ${pageNumber} from ${document.title} to image (fallback)`);
    }
  } catch (error) {
    console.error(`Failed to convert page ${pageNumber} of ${document.title}:`, error.message);
    throw error;
  } finally {
    try {
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp file ${tempPdfPath}:`, cleanupError.message);
    }
  }
};

// FALLBACK FUNCTION: Convert entire document to images (original method)
const convertDocumentToImages = async (document, existingPdfBytes, mergedPdf, processingErrors, progressCallback) => {
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp_convert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
  
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write PDF to temp file for pdf2pic
    fs.writeFileSync(tempPdfPath, Buffer.from(existingPdfBytes));
    
    // Verify file was written
    if (!fs.existsSync(tempPdfPath)) {
      throw new Error('Failed to write temporary PDF file');
    }
    
    // Verify file size
    const stats = fs.statSync(tempPdfPath);
    if (stats.size === 0) {
      throw new Error('Temporary PDF file is empty');
    }
    
    console.log(`Successfully wrote temp file for ${document.title} (${stats.size} bytes)`);
    
    // Sort the page numbers in ascending order
    const sortedPageNumbers = [...document.signaturePackagePages].sort((a, b) => a - b);
    
    for (let i = 0; i < sortedPageNumbers.length; i++) {
      const pageNumber = sortedPageNumbers[i];
      
      try {
        if (progressCallback) {
          progressCallback(`Converting page ${pageNumber} of ${document.title} to high-quality image...`);
        }
        console.log(`Converting page ${pageNumber} of ${document.title} to high-quality image...`);
        
        // Use ImageMagick directly for conversion
        const imageBuffer = await convertPageWithImageMagick(tempPdfPath, pageNumber);
        if (imageBuffer) {
          // Create a new PDF page from the image
          const imagePdf = await PDFDocument.create();
          const pngImage = await imagePdf.embedPng(imageBuffer);
          
          // Create page that matches the image size for maximum quality
          const page = imagePdf.addPage([pngImage.width, pngImage.height]);
          
          // Draw the image at full size (no scaling = no quality loss)
          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pngImage.width,
            height: pngImage.height,
          });
          
          // Copy this page to the merged PDF
          const [copiedPage] = await mergedPdf.copyPages(imagePdf, [0]);
          mergedPdf.addPage(copiedPage);
          
          console.log(`Successfully added page ${pageNumber} from ${document.title} as high-quality image`);
        } else {
          throw new Error('ImageMagick failed to convert page');
        }
      } catch (pageError) {
        console.error(`Failed to convert page ${pageNumber} of ${document.title}:`, pageError.message);
        
        // Create a placeholder page for failed conversions
        try {
          const placeholderPdf = await PDFDocument.create();
          const placeholderPage = placeholderPdf.addPage([595, 842]); // A4 size
          
          // Add placeholder text
          placeholderPage.drawText(`${document.title}`, {
            x: 50,
            y: 750,
            size: 14
          });
          placeholderPage.drawText(`Page ${pageNumber} could not be converted from PDF.`, {
            x: 50,
            y: 720,
            size: 12
          });
          placeholderPage.drawText(`This may be due to PDF corruption or security restrictions.`, {
            x: 50,
            y: 690,
            size: 10
          });
          placeholderPage.drawText(`Please review the original document.`, {
            x: 50,
            y: 660,
            size: 10
          });
          
          // Copy placeholder to merged PDF
          const [placeholder] = await mergedPdf.copyPages(placeholderPdf, [0]);
          mergedPdf.addPage(placeholder);
          
          const warningMsg = `Created placeholder for page ${pageNumber} of ${document.title} - conversion failed`;
          console.warn(warningMsg);
          processingErrors.push(warningMsg);
        } catch (placeholderError) {
          const errorMsg = `Failed to create placeholder for page ${pageNumber} of ${document.title}: ${placeholderError.message}`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
        }
      }
    }
    
  } catch (error) {
    console.error(`Image conversion failed for ${document.title}:`, error.message);
    const errorMsg = `Could not process ${document.title}: ${error.message}`;
    processingErrors.push(errorMsg);
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
        console.log(`Cleaned up temp file for ${document.title}`);
      }
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp file ${tempPdfPath}:`, cleanupError.message);
    }
  }
};

// Helper function to extract pages using image-based conversion as a fallback
const attemptImageBasedExtraction = async (document, existingPdfBytes, mergedPdf, processingErrors) => {
  console.log(`Attempting image-based extraction for ${document.title}`);
  
  try {
    // Use the new streamlined approach
    await convertSelectedPagesToImages(document, existingPdfBytes, mergedPdf, processingErrors, (status) => {
      console.log(`Progress: ${status}`);
      if (progressCallback) {
        progressCallback({
          status: status
        });
      }
    });
  } catch (error) {
    const errorMsg = `Image-based extraction failed for ${document.title}: ${error.message}`;
    console.error(errorMsg);
    throw error; // Re-throw to trigger the next fallback
  }
};

const getPdfPageCount = async (buffer) => {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { 
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false
    });
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error reading PDF with pdf-lib, falling back to default:', error);
    // Fallback to 1 page instead of 0 to avoid breaking the upload flow
    return 1;
  }
};

// Upload document to Claude Files API for enhanced AI processing
const uploadToClaudeFiles = async (fileBuffer, fileName) => {
  try {
    const response = await anthropic.files.create({
      file: fileBuffer,
      purpose: 'assistants'
    });
    
    console.log(`✅ File uploaded to Claude Files API: ${fileName}`);
    return response.id;
  } catch (error) {
    console.error('Error uploading to Claude Files API:', error);
    return null;
  }
};

// Helper function to generate thumbnail from PDF first page
const generateThumbnail = async (pdfBuffer, documentId) => {
  try {
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${documentId}_${Date.now()}.pdf`);
    const tempImagePath = path.join(tempDir, `temp_${documentId}_${Date.now()}_thumbnail.png`);

    // Write PDF buffer to temp file
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Convert first page to image using ImageMagick directly
    return new Promise((resolve, reject) => {
      imagemagick.convert([
        tempPdfPath + '[0]', // Input PDF, first page only
        '-density', '150',
        '-quality', '75',
        '-units', 'PixelsPerInch',
        '-resize', '300x400!',
        '-compress', 'jpeg',
        tempImagePath
      ], (err, stdout) => {
        // Clean up temp PDF file
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        
        if (err) {
          console.error('ImageMagick conversion error:', err);
          // Clean up temp image file if it exists
          if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
          reject(err);
          return;
        }
        
        // Read the converted image
        if (fs.existsSync(tempImagePath)) {
          const imageBuffer = fs.readFileSync(tempImagePath);
          // Clean up temp image file
          fs.unlinkSync(tempImagePath);
          resolve(imageBuffer);
        } else {
          reject(new Error('ImageMagick did not create output file'));
        }
      });
    });
  } catch (error) {
    // Clean up on error
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${documentId}_${Date.now()}.pdf`);
    const tempImagePath = path.join(tempDir, `temp_${documentId}_${Date.now()}_thumbnail.png`);
    
    if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    
    console.error('Error generating thumbnail:', error);
    return null;
  }
};


exports.uploadDocument = async (req, res) => {
  const { propertyListingId, visibility = 'public', purpose = 'listing', offerId } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const propertyListing = await PropertyListing.findById(propertyListingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to upload documents to this listing' });
    }

    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];

    const documents = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const title = titles[index];
      const type = types[index];
      const size = file.size;
      const contentType = file.mimetype;
      const docType = contentType === 'application/pdf' ? 'pdf' : 'image';

      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
      });

      // Skip page count calculation for RPA analysis documents since we don't need it
      const pages = (contentType === 'application/pdf' && purpose !== 'rpa_analysis') ? await getPdfPageCount(file.buffer) : 0;

      // Generate thumbnail for PDF documents
      let thumbnailUrl = null; // Default to null, will be set if thumbnail generation succeeds
      let thumbnailAzureKey = null; // Default to null, will be set if thumbnail generation succeeds
      if (contentType === 'application/pdf') {
        try {
          console.log(`Starting thumbnail generation for: ${file.originalname}`);
          const thumbnailBuffer = await generateThumbnail(file.buffer, uuidv4());
          if (thumbnailBuffer) {
            console.log(`Thumbnail generated successfully for: ${file.originalname}`);
            const thumbnailBlobName = `thumbnails/${uuidv4()}-${file.originalname.replace(/\.[^/.]+$/, '')}-thumb.png`;
            const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
            
            await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
              blobHTTPHeaders: { blobContentType: 'image/png' }
            });
            
            thumbnailUrl = thumbnailBlockBlobClient.url;
            thumbnailAzureKey = thumbnailBlobName;
            console.log(`Thumbnail uploaded to Azure: ${thumbnailUrl}`);
          } else {
            console.log(`Thumbnail generation returned null for: ${file.originalname}`);
          }
        } catch (error) {
          console.error('Error generating thumbnail for:', file.originalname, error);
          // Continue without thumbnail if generation fails
        }
      }

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
        thumbnailImageUrl: thumbnailUrl || null, // Thumbnail image URL (null if not generated)
        thumbnailAzureKey: thumbnailAzureKey || null, // Thumbnail Azure blob key
        uploadedBy: req.user.id,
        propertyListing: propertyListingId,
        azureKey: blobName,
        visibility,
        purpose,
        offer: offerId,
        docType,
        signed: false
      });

      const savedDocument = await newDocument.save();

      // Only process embeddings for documents that need to be searchable
      if (purpose === 'listing' || purpose === 'public') {
        try {
          await optimizedDocumentProcessor.processDocumentForSearch(savedDocument, file.buffer);
        } catch (err) {
          console.error('Embedding failed for document:', savedDocument._id, err.message);
        }
      }
      
      if (offerId) {
        await Offer.findByIdAndUpdate(offerId, { $push: { documents: savedDocument._id } });
      }
      
      propertyListing.documents.push(savedDocument._id);
      
      documents.push(savedDocument);
    }

    await propertyListing.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addDocumentToPropertyListing = async (req, res) => {
  const { visibility = 'public', purpose = 'listing' } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const propertyListing = await PropertyListing.findById(req.params.id);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    // Check if the authenticated user is authorized to add documents to this listing
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to add documents to this listing' });
    }
    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];

    const documents = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const title = titles[index];
      const type = types[index];
      const size = file.size;
      const contentType = file.mimetype;
      const docType = contentType === 'application/pdf' ? 'pdf' : 'image';

      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
      });

      // Skip page count calculation for RPA analysis documents since we don't need it
      const pages = (contentType === 'application/pdf' && purpose !== 'rpa_analysis') ? await getPdfPageCount(file.buffer) : 0;

      // Generate thumbnail for PDF documents (skip for RPA analysis documents)
      let thumbnailUrl = null; // Default to null, will be set if thumbnail generation succeeds
      if (contentType === 'application/pdf' && purpose !== 'rpa_analysis') {
        try {
          console.log(`Starting thumbnail generation for: ${file.originalname}`);
          const thumbnailBuffer = await generateThumbnail(file.buffer, uuidv4());
          if (thumbnailBuffer) {
            console.log(`Thumbnail generated successfully for: ${file.originalname}`);
            const thumbnailBlobName = `thumbnails/${uuidv4()}-${file.originalname.replace(/\.[^/.]+$/, '')}-thumb.png`;
            const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
            
            await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
              blobHTTPHeaders: { blobContentType: 'image/png' }
            });
            
            thumbnailUrl = thumbnailBlockBlobClient.url;
            console.log(`Thumbnail uploaded to Azure: ${thumbnailUrl}`);
          } else {
            console.log(`Thumbnail generation returned null for: ${file.originalname}`);
          }
        } catch (error) {
          console.error('Error generating thumbnail for:', file.originalname, error);
          // Continue without thumbnail if generation fails
        }
      }

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
        thumbnailImageUrl: thumbnailUrl || null, // Thumbnail image URL (null if not generated)
        propertyListing: req.params.id,
        uploadedBy: req.user.id,
        azureKey: blobName,
        visibility,
        purpose,
        docType
      });

      const savedDocument = await newDocument.save();
      
      // Only process embeddings for documents that need to be searchable
      if (purpose === 'listing' || purpose === 'public') {
        try {
          await optimizedDocumentProcessor.processDocumentForSearch(savedDocument, file.buffer);
        } catch (err) {
          console.error('Embedding failed for document:', savedDocument._id, err.message);
        }
      }
      
      propertyListing.documents.push(savedDocument._id);
      
      documents.push(savedDocument);
    }

    await propertyListing.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentsByListing = async (req, res) => {
  try {
    const propertyListing = await PropertyListing.findById(req.params.listingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    // Check if the authenticated user is authorized to view these documents
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }
    const documents = await Document.find({ propertyListing: req.params.listingId });
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
      thumbnailSasToken: doc.thumbnailAzureKey ? generateSASToken(doc.thumbnailAzureKey, doc.signed) : null,
    }));
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Optimized endpoint for documents list view - excludes heavy fields
exports.getDocumentsByListingOptimized = async (req, res) => {
  try {
    const propertyListing = await PropertyListing.findById(req.params.listingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    // Check if the authenticated user is authorized to view these documents
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }
    
    // Only select the fields needed for the documents list view
    const documents = await Document.find(
      { propertyListing: req.params.listingId },
      {
        title: 1,
        type: 1,
        size: 1,
        pages: 1,
        thumbnailUrl: 1,
        thumbnailImageUrl: 1,
        thumbnailAzureKey: 1,
        propertyListing: 1,
        uploadedBy: 1,
        azureKey: 1,
        updatedAt: 1,
        visibility: 1,
        signaturePackagePages: 1,
        purpose: 1,
        offer: 1,
        docType: 1,
        signed: 1,
        analysis: 1,
        lastProcessed: 1,
        claudeFileId: 1,
        docusignEnvelopeId: 1,
        signingStatus: 1,
        signedBy: 1,
        createdAt: 1
        // Excluded: textContent, textChunks, embeddings, enhancedContent
      }
    );
    
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
      thumbnailSasToken: doc.thumbnailAzureKey ? generateSASToken(doc.thumbnailAzureKey, doc.signed) : null,
    }));
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDocumentSignedStatus = async (req, res) => {
  const { documentId, signed } = req.body;

  try {
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the authenticated user is authorized to update this document
    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to update this document' });
    }
    document.signed = signed;
    const updatedDocument = await document.save();

    res.status(200).json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Allow the user who originally uploaded the document to delete it
    if (document.uploadedBy && document.uploadedBy.toString() === req.user.id) {
      // Delete embeddings from Pinecone before deleting the document
      await deleteDocumentEmbeddingsFromPinecone(document._id);
      await Document.deleteOne({ _id: req.params.id });
      return res.status(200).json({ message: 'Document deleted' });
    }

    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }
    
    // Delete from Azure storage
    const blobName = document.azureKey;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();

    // Delete embeddings from Pinecone before deleting the document
    await deleteDocumentEmbeddingsFromPinecone(document._id);

    await Document.deleteOne({ _id: req.params.id });

    // If this is a signature package document, also clear the signaturePackage reference
    if (document.purpose === 'signature_package') {
      await PropertyListing.findByIdAndUpdate(document.propertyListing, { 
        $pull: { documents: document._id },
        $unset: { signaturePackage: 1 }
      });
    } else {
      await PropertyListing.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });
    }

    res.status(200).json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addPageToSignaturePackage = async (req, res) => {
  const { documentId, page } = req.body;

  try {
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the authenticated user is authorized to modify this document
    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to modify this document' });
    }
    if (!document.signaturePackagePages.includes(page)) {
      const updatedDocument = await Document.findByIdAndUpdate(
        documentId,
        { $push: { signaturePackagePages: page } },
        { new: true, runValidators: false }
      );
      res.status(200).json(updatedDocument);
    } else {
      res.status(200).json(document);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removePageFromSignaturePackage = async (req, res) => {
  const { documentId, page } = req.body;

  try {
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the authenticated user is authorized to modify this document
    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to modify this document' });
    }
    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      { $pull: { signaturePackagePages: page } },
      { new: true, runValidators: false }
    );
    res.status(200).json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Progress-enabled version of createBuyerSignaturePacket
exports.createBuyerSignaturePacketWithProgress = async (req, res) => {
  // Set headers for streaming
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    await createBuyerSignaturePacketInternal(req, res, sendProgress);
  } catch (error) {
    sendProgress({ error: error.message });
    res.end();
  }
};

// Original version without progress tracking (for backward compatibility)
exports.createBuyerSignaturePacket = async (req, res) => {
  try {
    await createBuyerSignaturePacketInternal(req, res, null);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Error creating signature packet',
        error: error.message
      });
    }
  }
};

// Internal function that handles both progress and non-progress versions
const createBuyerSignaturePacketInternal = async (req, res, progressCallback) => {
  const { listingId, documentOrder, signaturePackageDocumentOrder } = req.body;

  // Memory monitoring
  const startMemory = process.memoryUsage();
  console.log('Memory usage at start:', {
    rss: Math.round(startMemory.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(startMemory.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(startMemory.heapTotal / 1024 / 1024) + 'MB'
  });

  // Set a timeout for this operation
  const timeout = setTimeout(() => {
    console.error('createBuyerSignaturePacket timeout after 120 seconds');
    if (!res.headersSent) {
      res.status(408).json({ 
        message: 'Request timeout. Please try again.', 
        error: 'REQUEST_TIMEOUT' 
      });
    }
  }, 120000); // 120 second timeout for up to 30 documents

  try {
    const propertyListing = await PropertyListing.findById(listingId).populate('signaturePackage');
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    // Check if the authenticated user is authorized to create a signature packet for this listing
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to create a signature packet for this listing' });
    }
    
    // Get all documents for this listing
    const documents = await Document.find({ propertyListing: listingId });
    
    // Check memory usage before processing
    const currentMemory = process.memoryUsage();
    const memoryUsageMB = Math.round(currentMemory.heapUsed / 1024 / 1024);
    console.log(`Current memory usage: ${memoryUsageMB}MB`);
    
    // If memory usage is too high, return an error
    if (memoryUsageMB > 3500) { // 3.5GB limit
      return res.status(503).json({ 
        message: 'Server is currently under high load. Please try again in a few minutes.',
        error: 'HIGH_MEMORY_USAGE'
      });
    }
    
    // Filter documents that have pages selected for the signature package
    let selectedDocuments = documents.filter(doc => doc.signaturePackagePages.length > 0);

    if (selectedDocuments.length === 0) {
      return res.status(400).json({ 
        message: 'No pages selected for the signature package.',
        error: 'NO_PAGES_SELECTED'
      });
    }
    
    // Pre-check document accessibility to identify issues early
    const accessibilityErrors = [];
    for (const document of selectedDocuments) {
      try {
        const sasToken = generateSASToken(document.azureKey);
        const documentUrlWithSAS = `${document.thumbnailUrl}?${sasToken}`;
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(documentUrlWithSAS, { method: 'HEAD' });
        
        if (!response.ok) {
          accessibilityErrors.push(`Document "${document.title}" is not accessible (${response.status}: ${response.statusText})`);
        }
      } catch (error) {
        accessibilityErrors.push(`Document "${document.title}" could not be accessed: ${error.message}`);
      }
    }
    
    if (accessibilityErrors.length > 0) {
      return res.status(400).json({
        message: 'Some documents are not accessible. Please refresh the page and try again.',
        error: 'DOCUMENTS_NOT_ACCESSIBLE',
        errors: accessibilityErrors
      });
    }
    
    // If signaturePackageDocumentOrder is provided, use it; otherwise fall back to documentOrder
    const orderToUse = signaturePackageDocumentOrder || documentOrder;
    if (orderToUse && Array.isArray(orderToUse) && orderToUse.length > 0) {
      // Create a map for quick lookup of document order
      const orderMap = new Map(orderToUse.map((id, index) => [id, index]));
      
      // Sort the selected documents based on the order
      selectedDocuments.sort((a, b) => {
        const orderA = orderMap.has(a._id.toString()) ? orderMap.get(a._id.toString()) : Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.has(b._id.toString()) ? orderMap.get(b._id.toString()) : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
      
      // Store the signature package document order in the property listing for persistence
      propertyListing.signaturePackageDocumentOrder = orderToUse;
      await propertyListing.save();
    }

    const mergedPdf = await PDFDocument.create();
    
    // Track any errors during document processing
    const processingErrors = [];
    // Track informational messages (like successful bypasses)
    const processingInfo = [];
    
    // Limit the number of documents processed at once to prevent memory issues
    const maxDocumentsPerRequest = 30;
    if (selectedDocuments.length > maxDocumentsPerRequest) {
      return res.status(400).json({ 
        message: `Too many documents selected. Maximum ${maxDocumentsPerRequest} documents allowed per signature package.`,
        error: 'TOO_MANY_DOCUMENTS'
      });
    }

    for (let docIndex = 0; docIndex < selectedDocuments.length; docIndex++) {
      const document = selectedDocuments[docIndex];
      try {
        const currentDoc = docIndex + 1;
        console.log(`Processing document: ${document.title}`);
        
        // Send progress update
        if (progressCallback) {
          progressCallback({
            progress: docIndex,
            currentDocument: currentDoc,
            totalDocuments: selectedDocuments.length,
            documentName: document.title,
            status: `Processing document ${currentDoc} of ${selectedDocuments.length}: ${document.title}`
          });
        }
        
        const sasToken = generateSASToken(document.azureKey);
        const documentUrlWithSAS = `${document.thumbnailUrl}?${sasToken}`;

        const fetch = (await import('node-fetch')).default;
        const response = await fetch(documentUrlWithSAS);

        if (!response.ok) {
          const errorMsg = `Failed to fetch document ${document.title}: ${response.statusText}`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }
        
        const contentType = response.headers.get('content-type');

        if (!contentType || (!contentType.includes('pdf') && contentType !== 'application/octet-stream')) {
          const errorMsg = `Document ${document.title} is not a PDF`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }

        // Process documents one at a time to reduce memory usage
        const existingPdfBytes = await response.arrayBuffer();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        try {
          // Add additional validation for PDF content
          if (existingPdfBytes.byteLength === 0) {
            const errorMsg = `Document ${document.title} appears to be empty or corrupted`;
                console.error(errorMsg);
                processingErrors.push(errorMsg);
            continue;
          }

          // NEW APPROACH: Convert selected pages directly to images, then to PDF
          // This completely bypasses PDF corruption issues
          console.log(`Converting selected pages from ${document.title} to images first...`);
          
          await convertSelectedPagesToImages(document, existingPdfBytes, mergedPdf, processingErrors, processingInfo, (status) => {
      console.log(`Progress: ${status}`);
      if (progressCallback) {
        progressCallback({
          status: status
        });
      }
    });
          
        } catch (pdfError) {
          const errorMsg = `Error loading PDF for document ${document.title}: ${pdfError.message}`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }
        
        // Force garbage collection after processing each document
        if (global.gc) {
          global.gc();
        }
      } catch (err) {
        // Restore console functions in case of error
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
        
        const errorMsg = `Error processing document ${document.title}: ${err.message}`;
        console.error(errorMsg);
        processingErrors.push(errorMsg);
        continue;
      }
    }
    
    // If no pages were successfully added to the merged PDF
    if (mergedPdf.getPageCount() === 0) {
      if (progressCallback) {
        progressCallback({ error: 'Failed to create signature packet. No pages could be processed.' });
        clearTimeout(timeout);
        res.end();
        return;
      }
      return res.status(400).json({ 
        message: 'Failed to create signature package. No pages could be processed.',
        error: 'NO_PAGES_PROCESSED',
        errors: processingErrors
      });
    }

    // Log any warnings
    if (processingInfo.length > 0 || processingErrors.length > 0) {
      const tempAllMessages = [...processingInfo, ...processingErrors];
      console.warn('Signature package created with warnings:', tempAllMessages);
    }
    
    // Only count actual errors (not info messages) for failure rate calculation
    if (processingErrors.length > 0) {
      // If more than 50% of documents failed, consider it a failure
      const failureRate = processingErrors.length / selectedDocuments.length;
      if (failureRate > 0.5) {
        if (progressCallback && !res.headersSent) {
          progressCallback({ error: 'Too many documents failed to process. Please check your documents and try again.' });
          clearTimeout(timeout);
          res.end();
          return;
        }
        return res.status(400).json({ 
          message: 'Too many documents failed to process. Please check your documents and try again.',
          error: 'HIGH_FAILURE_RATE',
          errors: processingErrors
        });
      }
      
      // If no pages were successfully added, return an error
      if (mergedPdf.getPageCount() === 0) {
        if (progressCallback && !res.headersSent) {
          progressCallback({ error: 'No valid pages could be extracted from the selected documents. Please check your documents and try again.' });
          clearTimeout(timeout);
          res.end();
          return;
        }
        return res.status(400).json({ 
          message: 'No valid pages could be extracted from the selected documents. Please check your documents and try again.',
          error: 'NO_VALID_PAGES',
          errors: processingErrors
        });
      }
    }

    const pdfBytes = await mergedPdf.save();
    const blobName = `documents/${uuidv4()}-DisclosureSignaturePacket.pdf`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(pdfBytes);

    // If there's an existing signature package, delete it
    if (propertyListing.signaturePackage) {
      const oldDocument = await Document.findById(propertyListing.signaturePackage);
      if (oldDocument) {
        const oldBlobName = oldDocument.azureKey;
        const oldBlockBlobClient = containerClient.getBlockBlobClient(oldBlobName);
        await oldBlockBlobClient.delete();
        
        // Delete embeddings from Pinecone before deleting the document
        await deleteDocumentEmbeddingsFromPinecone(oldDocument._id);
        
        await Document.deleteOne({ _id: oldDocument._id });
      }
    }

    // Generate thumbnail for signature package
    let thumbnailImageUrl = blockBlobClient.url; // Default to original document URL
    let thumbnailAzureKey = null; // Default to null, will be set if thumbnail generation succeeds
    try {
      const thumbnailBuffer = await generateThumbnail(Buffer.from(pdfBytes), uuidv4());
      if (thumbnailBuffer) {
        const thumbnailBlobName = `thumbnails/${uuidv4()}-signature-package-thumb.png`;
        const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
        
        await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
          blobHTTPHeaders: { blobContentType: 'image/png' }
        });
        
        thumbnailImageUrl = thumbnailBlockBlobClient.url;
        thumbnailAzureKey = thumbnailBlobName;
      }
    } catch (error) {
      console.error('Error generating thumbnail for signature package:', error);
      // Continue without thumbnail if generation fails
    }

    const newDocument = new Document({
      title: 'To Be Signed by Buyer (For Offer)',
      type: 'Disclosure Signature Packet',
      size: pdfBytes.byteLength,
      pages: mergedPdf.getPageCount(),
      thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
      thumbnailImageUrl,
      thumbnailAzureKey: thumbnailAzureKey || null, // Thumbnail Azure blob key
      propertyListing: listingId,
      uploadedBy: req.user.id,
      azureKey: blobName,
      docType: 'pdf',
      purpose: 'signature_package'
    });

    const savedDocument = await newDocument.save();


    propertyListing.signaturePackage = savedDocument._id;
    await propertyListing.save();

    // Calculate success statistics
    const successfulDocuments = selectedDocuments.length - processingErrors.length;
    const totalPages = mergedPdf.getPageCount();
    
    // Combine processing info and errors for final response
    const allMessages = [...processingInfo, ...processingErrors];
    
    console.log(`Signature package created successfully: ${successfulDocuments}/${selectedDocuments.length} documents processed, ${totalPages} pages total`);

    // Memory monitoring at end
    const endMemory = process.memoryUsage();
    console.log('Memory usage at end:', {
      rss: Math.round(endMemory.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(endMemory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(endMemory.heapTotal / 1024 / 1024) + 'MB'
    });
    
    // Clear the timeout
    clearTimeout(timeout);
    
    // Send final progress update
    if (progressCallback) {
      progressCallback({
        complete: true,
        currentDocument: selectedDocuments.length,
        totalDocuments: selectedDocuments.length,
        status: 'Signature package created successfully!'
      });
      res.end();
      return;
    }

    // Only send JSON response if we're not using progress callback
    if (!progressCallback) {
      // Return the saved document along with any processing errors
      const response = {
        document: savedDocument,
        pageCount: mergedPdf.getPageCount(),
        documentOrder: propertyListing.documentOrder,
        signaturePackageDocumentOrder: propertyListing.signaturePackageDocumentOrder,
        statistics: {
          totalDocuments: selectedDocuments.length,
          successfulDocuments: successfulDocuments,
          failedDocuments: processingErrors.length,
          totalPages: totalPages
        }
      };
      
      if (allMessages.length > 0) {
        response.warnings = allMessages;
      }
    
    res.status(201).json(response);
    }
  } catch (error) {
    // Clear the timeout
    clearTimeout(timeout);
    
    console.error('Error creating/updating disclosure signature packet:', error);
    
    // Log more detailed error information
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error creating signature packet', 
        error: error.message 
      });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'Service temporarily unavailable. Please try again.', 
        error: 'SERVICE_UNAVAILABLE' 
      });
    }
    
    if (error.code === 'ENOENT') {
      return res.status(500).json({ 
        message: 'File system error during signature packet creation. Please try again.', 
        error: 'FILE_SYSTEM_ERROR' 
      });
    }
    
    // Prevent server crashes from unhandled errors
    if (!res.headersSent) {
    res.status(500).json({ 
      message: 'Error creating/updating disclosure signature packet', 
      error: error.message 
    });
    }
  }
};

exports.getDocumentsByOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId).populate('propertyListing');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
    const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    const isBuyersAgent = offer.buyersAgent && offer.buyersAgent.toString() === req.user.id;
    
    if (!isListingCreator && !isListingAgent && !isTeamMember && !isBuyersAgent) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }
    
    const documents = await Document.find({ offer: req.params.offerId }).sort({ createdAt: 1 });
    if (!documents || documents.length === 0) {
      return res.status(404).json({ message: 'No documents found for this offer' });
    }
    
    // Process documents to prioritize signed versions for display
    const processedDocuments = [];
    const signedDocuments = documents.filter(doc => doc.signed && doc.purpose === 'signed_offer');
    const unsignedDocuments = documents.filter(doc => !doc.signed && doc.purpose !== 'signed_offer');
    
    // If we have signed documents, show those instead of the unsigned versions
    if (signedDocuments.length > 0) {
      // Add signed documents first
      signedDocuments.forEach(doc => {
        processedDocuments.push({
          ...doc._doc,
          sasToken: generateSASToken(doc.azureKey, doc.signed),
          displayType: 'signed' // Mark as signed for frontend handling
        });
      });
      
      // Add any unsigned documents that don't have signed counterparts
      // For now, if there are signed documents, we'll only show those
      // This can be refined based on specific business requirements
    } else {
      // No signed documents exist, show all unsigned documents
      unsignedDocuments.forEach(doc => {
        processedDocuments.push({
          ...doc._doc,
          sasToken: generateSASToken(doc.azureKey, doc.signed),
          displayType: 'unsigned' // Mark as unsigned for frontend handling
        });
      });
    }
    
    res.status(200).json(processedDocuments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentsForBuyerPackage = async (req, res) => {
  try {
    const { buyerPackageId } = req.params;
    
    // First, get the buyer package to verify the user has access
    const BuyerPackage = require('../models/BuyerPackage');
    const buyerPackage = await BuyerPackage.findById(buyerPackageId);
    
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }
    
    // Check if the authenticated user is the buyer of this package
    if (buyerPackage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this buyer package' });
    }
    
    // Get the property listing from the buyer package
    const propertyListing = buyerPackage.propertyListing;
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found in buyer package' });
    }
    
    // Get documents for the property listing
    const documents = await Document.find({ propertyListing: propertyListing });
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
    }));
    
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    console.error('Error fetching documents for buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Optimized endpoint for buyer package documents list view - excludes heavy fields
exports.getDocumentsForBuyerPackageOptimized = async (req, res) => {
  try {
    const { buyerPackageId } = req.params;
    
    // First, get the buyer package to verify the user has access
    const BuyerPackage = require('../models/BuyerPackage');
    const buyerPackage = await BuyerPackage.findById(buyerPackageId);
    
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }
    
    // Check if the authenticated user is the buyer of this package
    if (buyerPackage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this buyer package' });
    }
    
    // Get the property listing from the buyer package
    const propertyListing = buyerPackage.propertyListing;
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found in buyer package' });
    }
    
    // Get documents for the property listing with only necessary fields
    const documents = await Document.find(
      { propertyListing: propertyListing },
      {
        title: 1,
        type: 1,
        size: 1,
        pages: 1,
        thumbnailUrl: 1,
        thumbnailImageUrl: 1,
        thumbnailAzureKey: 1,
        propertyListing: 1,
        uploadedBy: 1,
        azureKey: 1,
        updatedAt: 1,
        visibility: 1,
        signaturePackagePages: 1,
        purpose: 1,
        offer: 1,
        docType: 1,
        signed: 1,
        analysis: 1,
        lastProcessed: 1,
        claudeFileId: 1,
        docusignEnvelopeId: 1,
        signingStatus: 1,
        signedBy: 1,
        createdAt: 1
        // Excluded: textContent, textChunks, embeddings, enhancedContent
      }
    );
    
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
      thumbnailSasToken: doc.thumbnailAzureKey ? generateSASToken(doc.thumbnailAzureKey, doc.signed) : null,
    }));
    
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    console.error('Error fetching documents for buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add this new function at the end of the file
exports.deleteAllDocuments = async (req, res) => {
  console.log('deleteAllDocuments function called');
  try {
    const secretKey = req.query.secretKey;
    console.log('Received secretKey:', secretKey);
    console.log('Expected secretKey:', process.env.DELETE_ALL_SECRET);
    
    if (secretKey !== process.env.DELETE_ALL_SECRET) {
      console.log('Unauthorized: Secret key mismatch');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    console.log('Authorization successful, proceeding with deletion');
    
    // Get all documents before deletion to clean up Pinecone
    const documents = await Document.find({});
    console.log(`Found ${documents.length} documents to delete`);
    
    // Delete embeddings from Pinecone for all documents
    for (const document of documents) {
      try {
        await deleteDocumentEmbeddingsFromPinecone(document._id);
      } catch (error) {
        console.error(`Failed to delete Pinecone embeddings for document ${document._id}:`, error);
        // Continue with other documents even if one fails
      }
    }
    
    const result = await Document.deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents`);
    res.json({ message: `Deleted ${result.deletedCount} documents and cleaned up Pinecone embeddings` });
  } catch (error) {
    console.error('Error in deleteAllDocuments:', error);
    res.status(500).json({ message: 'Error deleting documents', error: error.toString() });
  }
};
module.exports = exports;

exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const document = await Document.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.status(200).json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.addPage = async (req, res) => {
  try {
    const { documentId, page } = req.body;
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (!document.signaturePackagePages.includes(page)) {
      document.signaturePackagePages.push(page);
      await document.save();
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error adding page to signature package:', error);
    res.status(500).json({ message: 'Error adding page to signature package', error: error.message });
  }
};

exports.removePage = async (req, res) => {
  try {
    const { documentId, page } = req.body;
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    document.signaturePackagePages = document.signaturePackagePages.filter(p => p !== page);
    await document.save();
    
    res.json(document);
  } catch (error) {
    console.error('Error removing page from signature package:', error);
    res.status(500).json({ message: 'Error removing page from signature package', error: error.message });
  }
};

exports.setAllPages = async (req, res) => {
  try {
    const { documentId, totalPages } = req.body;
    
    if (!totalPages || typeof totalPages !== 'number' || totalPages <= 0) {
      return res.status(400).json({ message: 'Invalid totalPages parameter' });
    }
    
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Create an array of all page numbers from 1 to totalPages
    document.signaturePackagePages = Array.from({ length: totalPages }, (_, i) => i + 1);
    await document.save();
    
    res.json(document);
  } catch (error) {
    console.error('Error setting all pages for signature package:', error);
    res.status(500).json({ message: 'Error setting all pages for signature package', error: error.message });
  }
};

exports.clearPages = async (req, res) => {
  try {
    const { documentId } = req.body;
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    document.signaturePackagePages = [];
    await document.save();
    
    res.json(document);
  } catch (error) {
    console.error('Error clearing pages from signature package:', error);
    res.status(500).json({ message: 'Error clearing pages from signature package', error: error.message });
  }
};

exports.getSingleDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check authorization based on the document's purpose and ownership
    let propertyListing = null;
    if (document.propertyListing) {
      // For listing documents, check if user owns the listing
      propertyListing = await PropertyListing.findById(document.propertyListing);
      if (!propertyListing) {
        return res.status(404).json({ message: 'Property listing not found' });
      }
      
      const isCreator = propertyListing.createdBy.toString() === req.user.id;
      const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      
      if (!isCreator && !isAgent && !isTeamMember) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else if (document.offer) {
      // For offer documents, check if user owns the listing the offer is for
      const offer = await Offer.findById(document.offer).populate('propertyListing');
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
      const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      const isBuyersAgent = offer.buyersAgent && offer.buyersAgent.toString() === req.user.id;
      
      if (!isListingCreator && !isListingAgent && !isTeamMember && !isBuyersAgent) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    }
    
    // Generate SAS token for the document
    const sasToken = generateSASToken(document.azureKey);
    const documentWithSasToken = {
      ...document._doc,
      sasToken: sasToken
    };
    
    res.json(documentWithSasToken);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Error fetching document', error: error.message });
  }
};

// New endpoint to refresh SAS token for a document
exports.refreshDocumentToken = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check authorization based on the document's purpose and ownership
    let propertyListing = null;
    if (document.propertyListing) {
      // For listing documents, check if user owns the listing
      propertyListing = await PropertyListing.findById(document.propertyListing);
      if (!propertyListing) {
        return res.status(404).json({ message: 'Property listing not found' });
      }
      
      const isCreator = propertyListing.createdBy.toString() === req.user.id;
      const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      
      if (!isCreator && !isAgent && !isTeamMember) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else if (document.offer) {
      // For offer documents, check if user owns the listing the offer is for
      const offer = await Offer.findById(document.offer).populate('propertyListing');
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
      const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      const isBuyersAgent = offer.buyersAgent && offer.buyersAgent.toString() === req.user.id;
      
      if (!isListingCreator && !isListingAgent && !isTeamMember && !isBuyersAgent) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    }
    
    // Generate fresh SAS token for the document
    const sasToken = generateSASToken(document.azureKey, document.signed);
    
    res.json({ 
      sasToken: sasToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing document token:', error);
    res.status(500).json({ message: 'Error refreshing document token', error: error.message });
  }
};

// Update downloadDocument to proxy the file
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check authorization based on the document's purpose and ownership
    let propertyListing = null;
    if (document.propertyListing) {
      // For listing documents, check if user owns the listing
      propertyListing = await PropertyListing.findById(document.propertyListing);
      if (!propertyListing) {
        return res.status(404).json({ message: 'Property listing not found' });
      }
      
      const isCreator = propertyListing.createdBy.toString() === req.user.id;
      const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      
      if (!isCreator && !isAgent && !isTeamMember) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else if (document.offer) {
      // For offer documents, check if user owns the listing the offer is for
      const offer = await Offer.findById(document.offer).populate('propertyListing');
      if (!offer || !offer.propertyListing) {
        return res.status(404).json({ message: 'Offer or property listing not found' });
      }
      
      const isCreator = offer.propertyListing.createdBy.toString() === req.user.id;
      const isAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      
      if (!isCreator && !isAgent && !isTeamMember) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
      propertyListing = offer.propertyListing;
    } else {
      // Document has no associated listing or offer
      return res.status(403).json({ message: 'Not authorized to access this document' });
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(document.azureKey);
    
    // Get blob properties
    const properties = await blockBlobClient.getProperties();
    
    // Set response headers
    res.setHeader('Content-Type', properties.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', properties.contentLength);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.title)}"`);
    
    // Create activity record for the download
    const Activity = require('../models/Activity');
    const activity = new Activity({
      user: req.user.id,
      action: `downloaded ${document.title}`,
      type: 'download',
      documentModified: document._id,
      propertyListing: propertyListing?._id,
      metadata: {
        documentTitle: document.title,
        documentType: document.type,
        userRole: req.user.role || 'user'
      }
    });

    // Save activity asynchronously (don't wait for it)
    activity.save().catch(error => {
      console.error('Error saving download activity:', error);
    });
    
    // Download and stream the blob
    const downloadResponse = await blockBlobClient.download(0);
    downloadResponse.readableStreamBody.pipe(res);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Error downloading document', error: error.message });
  }
};

// Upload document for buyer package (buyer context)
exports.uploadDocumentForBuyerPackage = async (req, res) => {
  const { visibility = 'public', purpose = 'offer' } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    // Get the buyer package to verify the user has access
    const BuyerPackage = require('../models/BuyerPackage');
    const buyerPackage = await BuyerPackage.findById(req.params.buyerPackageId);
    
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }
    
    // Check if the authenticated user is the buyer of this package
    if (buyerPackage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload documents to this buyer package' });
    }
    
    // Get the property listing from the buyer package
    const propertyListing = buyerPackage.propertyListing;
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found in buyer package' });
    }

    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];

    const documents = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const title = titles[index];
      const type = types[index];
      const size = file.size;
      const contentType = file.mimetype;
      const docType = contentType === 'application/pdf' ? 'pdf' : 'image';

      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
      });

      // Skip page count calculation for RPA analysis documents since we don't need it
      const pages = (contentType === 'application/pdf' && purpose !== 'rpa_analysis') ? await getPdfPageCount(file.buffer) : 0;

      // Generate thumbnail for PDF documents (skip for RPA analysis documents)
      let thumbnailUrl = null; // Default to null, will be set if thumbnail generation succeeds
      if (contentType === 'application/pdf' && purpose !== 'rpa_analysis') {
        try {
          console.log(`Starting thumbnail generation for: ${file.originalname}`);
          const thumbnailBuffer = await generateThumbnail(file.buffer, uuidv4());
          if (thumbnailBuffer) {
            console.log(`Thumbnail generated successfully for: ${file.originalname}`);
            const thumbnailBlobName = `thumbnails/${uuidv4()}-${file.originalname.replace(/\.[^/.]+$/, '')}-thumb.png`;
            const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
            
            await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
              blobHTTPHeaders: { blobContentType: 'image/png' }
            });
            
            thumbnailUrl = thumbnailBlockBlobClient.url;
            console.log(`Thumbnail uploaded to Azure: ${thumbnailUrl}`);
          } else {
            console.log(`Thumbnail generation returned null for: ${file.originalname}`);
          }
        } catch (error) {
          console.error('Error generating thumbnail for:', file.originalname, error);
          // Continue without thumbnail if generation fails
        }
      }

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
        thumbnailImageUrl: thumbnailUrl || null, // Thumbnail image URL (null if not generated)
        uploadedBy: req.user.id,
        propertyListing: propertyListing,
        azureKey: blobName,
        visibility,
        purpose,
        docType,
        signed: false
      });

      const savedDocument = await newDocument.save();
      
      // Only process embeddings for documents that need to be searchable
      if (purpose === 'listing' || purpose === 'public') {
        try {
          await optimizedDocumentProcessor.processDocumentForSearch(savedDocument, file.buffer);
        } catch (err) {
          console.error('Embedding failed for document:', savedDocument._id, err.message);
        }
      }
      
      documents.push(savedDocument);
    }

    res.status(201).json(documents);
  } catch (error) {
    console.error('Error uploading document for buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single document for buyer package (buyer context)
exports.getSingleDocumentForBuyerPackage = async (req, res) => {
  try {
    const { buyerPackageId, documentId } = req.params;
    
    // Get the buyer package to verify the user has access
    const BuyerPackage = require('../models/BuyerPackage');
    const buyerPackage = await BuyerPackage.findById(buyerPackageId);
    
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }
    
    // Check if the authenticated user is the buyer of this package
    if (buyerPackage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this buyer package' });
    }
    
    // Get the document
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Verify the document is associated with the property listing from the buyer package
    if (document.propertyListing.toString() !== buyerPackage.propertyListing.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this document' });
    }
    
    // Generate SAS token for the document
    const sasToken = generateSASToken(document.azureKey);
    const documentWithSasToken = {
      ...document._doc,
      sasToken: sasToken
    };
    
    res.json(documentWithSasToken);
  } catch (error) {
    console.error('Error fetching document for buyer package:', error);
    res.status(500).json({ message: 'Error fetching document', error: error.message });
  }
};

// Streaming upload endpoint with real-time progress
exports.uploadDocumentsWithProgress = async (req, res) => {
  try {
    const { purpose = 'listing', uploadedBy, propertyListingId } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Set headers for streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const documents = [];
    const propertyListing = await PropertyListing.findById(propertyListingId);
    
    if (!propertyListing) {
      res.write('data: {"error": "Property listing not found"}\n\n');
      res.end();
      return;
    }

    // Check authorization
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      res.write('data: {"error": "Not authorized to upload documents to this listing"}\n\n');
      res.end();
      return;
    }

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      
      // Send progress update
      res.write(`data: {"progress": ${Math.round(((index + 1) / files.length) * 100)}, "currentFile": ${index + 1}, "totalFiles": ${files.length}, "fileName": "${file.originalname}"}\n\n`);

      try {
        // Get page count for PDFs
        let pages = 0;
        if (file.mimetype === 'application/pdf') {
          pages = await getPdfPageCount(file.buffer);
        }

        // Generate thumbnail for PDFs
        let thumbnailUrl = null;
        let thumbnailAzureKey = null;
        if (file.mimetype === 'application/pdf') {
          try {
            console.log(`Starting thumbnail generation for: ${file.originalname}`);
            const thumbnailBuffer = await generateThumbnail(file.buffer, `thumbnail_${Date.now()}_${index}`);
            if (thumbnailBuffer) {
              console.log(`Thumbnail generated successfully for: ${file.originalname}`);
              const thumbnailBlobName = `thumbnails/${Date.now()}_${index}_${file.originalname.replace(/\.[^/.]+$/, '')}-thumb.png`;
              const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
              
              await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
                blobHTTPHeaders: { blobContentType: 'image/png' }
              });
              
              thumbnailUrl = thumbnailBlockBlobClient.url;
              thumbnailAzureKey = thumbnailBlobName;
            }
          } catch (thumbnailError) {
            console.error('Thumbnail generation failed:', thumbnailError);
          }
        }

        // Upload to Azure
        const azureKey = `documents/${propertyListingId}/${Date.now()}_${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(azureKey);
        await blockBlobClient.upload(file.buffer, file.buffer.length);

        // Create document record
        const newDocument = new Document({
          title: req.body.title ? req.body.title[index] : file.originalname,
          type: req.body.type ? req.body.type[index] : 'Other',
          size: file.size,
          pages,
          thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
          thumbnailImageUrl: thumbnailUrl || null, // Thumbnail image URL (null if not generated)
          thumbnailAzureKey: thumbnailAzureKey || null, // Thumbnail Azure blob key
          propertyListing: propertyListingId,
          uploadedBy,
          azureKey,
          purpose,
          docType: file.mimetype === 'application/pdf' ? 'pdf' : 'image'
        });

        const savedDocument = await newDocument.save();

        // Only process embeddings for documents that need to be searchable
        if (purpose === 'listing' || purpose === 'public') {
          // Process document for search (this is the time-consuming part)
          res.write(`data: {"processing": "Processing ${file.originalname} for AI search..."}\n\n`);
          
          try {
            await optimizedDocumentProcessor.processDocumentForSearch(savedDocument, file.buffer);
            res.write(`data: {"processing": "Completed processing ${file.originalname}"}\n\n`);
          } catch (err) {
            console.error('Embedding failed for document:', savedDocument._id, err.message);
            res.write(`data: {"processing": "Warning: AI processing failed for ${file.originalname}"}\n\n`);
          }
        }

        propertyListing.documents.push(savedDocument._id);
        documents.push(savedDocument);

      } catch (error) {
        console.error('Error processing file:', file.originalname, error);
        res.write(`data: {"error": "Failed to process ${file.originalname}: ${error.message}"}\n\n`);
      }
    }

    // Save property listing
    await propertyListing.save();

    // Send completion with just document IDs to avoid large JSON payload
    const documentIds = documents.map(doc => doc._id);
    res.write(`data: {"complete": true, "documentIds": ${JSON.stringify(documentIds)}}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in streaming upload:', error);
    res.write(`data: {"error": "${error.message}"}\n\n`);
    res.end();
  }
};
