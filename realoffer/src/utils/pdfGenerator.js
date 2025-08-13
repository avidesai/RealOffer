import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Test function to verify PDF generation works
export const testPDFGeneration = async () => {
  const testContent = `# Test Analysis Report

This is a test analysis report to verify PDF generation works correctly.

## Key Findings

- **Finding 1**: This is the first key finding
- **Finding 2**: This is the second key finding
- **Finding 3**: This is the third key finding

## Recommendations

1. First recommendation
2. Second recommendation
3. Third recommendation

## Summary

This is a summary of the test analysis report. The PDF should be properly formatted with headers, bullet points, and numbered lists.`;

  try {
    await downloadAnalysisPDF(testContent, 'Test Document', 'Test Analysis Report');
    console.log('PDF generation test successful!');
  } catch (error) {
    console.error('PDF generation test failed:', error);
  }
};

export const generateAnalysisPDF = async (analysisContent, documentType, documentTitle) => {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed the standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add a page
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    // Set margins
    const margin = 50;
    const contentWidth = width - (margin * 2);
    let currentY = height - margin;
    
    // Helper function to add text with word wrapping
    const addWrappedText = (text, font, fontSize, maxWidth, y, color = rgb(0, 0, 0)) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Word is too long, break it
            lines.push(word);
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };
    
    // Helper function to draw text
    const drawText = (text, x, y, font, fontSize, color = rgb(0, 0, 0), currentPageRef) => {
      const targetPage = currentPageRef || page;
      targetPage.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color,
      });
    };
    
    // Helper function to draw wrapped text
    const drawWrappedText = (text, x, y, font, fontSize, maxWidth, color = rgb(0, 0, 0), currentPageRef) => {
      const lines = addWrappedText(text, font, fontSize, maxWidth, y, color);
      let currentY = y;
      let currentPage = currentPageRef || page;
      
      for (const line of lines) {
        if (currentY < margin + 20) {
          // Add new page if we're running out of space
          currentPage = pdfDoc.addPage([595.28, 841.89]);
          currentY = height - margin;
        }
        
        currentPage.drawText(line, {
          x,
          y: currentY,
          size: fontSize,
          font,
          color,
        });
        currentY -= fontSize * 1.2; // Line spacing
      }
      
      return { currentY, currentPage };
    };
    
    // Add header
    const headerText = `${documentType} Analysis`;
    const headerFontSize = 24;
    const headerWidth = boldFont.widthOfTextAtSize(headerText, headerFontSize);
    drawText(headerText, (width - headerWidth) / 2, currentY, boldFont, headerFontSize, rgb(0.2, 0.2, 0.2), page);
    currentY -= headerFontSize * 1.5;
    
    // Add document title
    if (documentTitle) {
      const titleText = `Document: ${documentTitle}`;
      const titleFontSize = 14;
      drawText(titleText, margin, currentY, font, titleFontSize, rgb(0.4, 0.4, 0.4), page);
      currentY -= titleFontSize * 1.5;
    }
    
    // Add date
    const dateText = `Generated on: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })}`;
    const dateFontSize = 12;
    drawText(dateText, margin, currentY, font, dateFontSize, rgb(0.5, 0.5, 0.5), page);
    currentY -= dateFontSize * 2;
    
    // Add separator line
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: width - margin, y: currentY },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    currentY -= 20;
    
    // Process the analysis content
    const contentLines = analysisContent.split('\n');
    let currentPage = page;
    
    for (const line of contentLines) {
      // Check if we need a new page
      if (currentY < margin + 50) {
        currentPage = pdfDoc.addPage([595.28, 841.89]);
        currentY = height - margin;
      }
      
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        currentY -= 12; // Empty line spacing
        continue;
      }
      
      // Check if this is a heading (starts with # or is all caps)
      const isHeading = trimmedLine.startsWith('#') || 
                       (trimmedLine.length > 3 && trimmedLine === trimmedLine.toUpperCase() && !trimmedLine.includes('.')) ||
                       trimmedLine.match(/^[A-Z][a-z]+.*:$/);
      
      if (isHeading) {
        // Handle headings
        const headingText = trimmedLine.replace(/^#+\s*/, ''); // Remove markdown # symbols
        const headingFontSize = 16;
        const headingColor = rgb(0.2, 0.4, 0.6);
        
        const result = drawWrappedText(headingText, boldFont, headingFontSize, contentWidth, currentY, headingColor, currentPage);
        currentY = result.currentY;
        currentPage = result.currentPage;
        currentY -= 8; // Extra spacing after heading
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Handle bullet points
        const bulletText = trimmedLine.substring(2);
        const bulletFontSize = 12;
        
        // Draw bullet point
        currentPage.drawText('•', {
          x: margin,
          y: currentY,
          size: bulletFontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        
        // Draw bullet text
        const result = drawWrappedText(bulletText, font, bulletFontSize, contentWidth - 20, currentY, rgb(0.2, 0.2, 0.2), currentPage);
        currentY = result.currentY;
        currentPage = result.currentPage;
        currentY -= 4; // Spacing between bullet points
      } else if (trimmedLine.match(/^\d+\./)) {
        // Handle numbered lists
        const numberedText = trimmedLine.replace(/^\d+\.\s*/, '');
        const numberedFontSize = 12;
        
        // Extract the number
        const numberMatch = trimmedLine.match(/^(\d+)\./);
        const number = numberMatch ? numberMatch[1] : '';
        
        // Draw number
        currentPage.drawText(`${number}.`, {
          x: margin,
          y: currentY,
          size: numberedFontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        
        // Draw numbered text
        const result = drawWrappedText(numberedText, font, numberedFontSize, contentWidth - 30, currentY, rgb(0.2, 0.2, 0.2), currentPage);
        currentY = result.currentY;
        currentPage = result.currentPage;
        currentY -= 4; // Spacing between numbered items
      } else {
        // Regular paragraph text
        const paragraphFontSize = 12;
        const result = drawWrappedText(trimmedLine, font, paragraphFontSize, contentWidth, currentY, rgb(0.2, 0.2, 0.2), currentPage);
        currentY = result.currentY;
        currentPage = result.currentPage;
        currentY -= 6; // Spacing between paragraphs
      }
    }
    
    // Add footer to each page
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      const footerText = `Page ${index + 1} of ${pages.length}`;
      const footerFontSize = 10;
      const footerWidth = font.widthOfTextAtSize(footerText, footerFontSize);
      
      page.drawText(footerText, {
        x: (width - footerWidth) / 2,
        y: 30,
        size: footerFontSize,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const downloadAnalysisPDF = async (analysisContent, documentType, documentTitle) => {
  try {
    const pdfBytes = await generateAnalysisPDF(analysisContent, documentType, documentTitle);
    
    // Create blob and download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const element = document.createElement('a');
    element.href = url;
    element.download = `${documentType} Analysis.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    // Clean up
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};
