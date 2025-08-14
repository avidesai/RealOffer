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

export const generateAnalysisPDF = async (analysisContent, documentType, documentTitle, addressLine) => {
  try {
    console.log('generateAnalysisPDF called with:', { documentType, documentTitle, addressLine, contentLength: analysisContent?.length });
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    console.log('PDF document created');
    
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
      
      // Simple word wrapping based on character count estimation
      // This is a simplified approach since pdf-lib doesn't have widthOfTextAtSize
      const avgCharWidth = fontSize * 0.6; // Rough estimation
      const maxChars = Math.floor(maxWidth / avgCharWidth);
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        
        if (testLine.length <= maxChars) {
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
    
    // Helper function to draw wrapped text (single style)
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

    // Parse markdown bold segments **...** into runs
    const parseBoldSegments = (text) => {
      const segments = [];
      const regex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          segments.push({ text: text.slice(lastIndex, match.index), bold: false });
        }
        segments.push({ text: match[1], bold: true });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < text.length) {
        segments.push({ text: text.slice(lastIndex), bold: false });
      }
      return segments.filter(seg => seg.text.length > 0);
    };

    // Replace unsupported characters (emoji etc.) with safe fallbacks for WinAnsi fonts
    const sanitizeTextForPdf = (input) => {
      if (!input) return '';
      let t = input
        .replace(/✅/g, '[OK]')
        .replace(/⚠️/g, '[Warning]')
        .replace(/❌/g, '[Issue]')
        .replace(/\uFE0F/g, '') // variation selector
        .replace(/[\uD800-\uDFFF]/g, ''); // remove surrogate pairs (most emoji)
      // Common typography fallbacks
      t = t
        .replace(/[–—]/g, '-')
        .replace(/[“”]/g, '"')
        .replace(/[’]/g, "'");
      return t;
    };

    // Draw wrapped text with mixed bold/regular segments
    // eslint-disable-next-line no-unused-vars
    const drawRichWrappedText = (text, x, y, regularFont, boldFontObj, fontSize, maxWidth, color = rgb(0,0,0), currentPageRef) => {
      const safeText = sanitizeTextForPdf(text);
      let currentY = y;
      let currentX = x;
      let currentPage = currentPageRef || page;
      const lineHeight = fontSize * 1.2;
      const maxX = x + maxWidth;

      const segments = parseBoldSegments(safeText);

      const estimateWidth = (t, isBold) => {
        const factor = isBold ? 0.62 : 0.6; // slight tweak for bold
        return t.length * fontSize * factor;
      };

      const ensureSpace = () => {
        if (currentY < margin + 20) {
          currentPage = pdfDoc.addPage([595.28, 841.89]);
          currentY = height - margin;
          currentX = x;
        }
      };

      for (const seg of segments) {
        const segFont = seg.bold ? boldFontObj : regularFont;
        const tokens = seg.text.split(/(\s+)/); // keep spaces as tokens
        for (let token of tokens) {
          if (token.length === 0) continue;
          const isSpace = /^\s+$/.test(token);
          if (!isSpace) {
            // May need to split long token across lines
            while (token.length > 0) {
              const available = Math.max(0, maxX - currentX);
              if (available <= 0) {
                currentY -= lineHeight;
                ensureSpace();
                currentX = x;
              }
              const factor = seg.bold ? 0.62 : 0.6;
              const approxChars = Math.max(1, Math.floor(available / (fontSize * factor)));
              const chunk = token.slice(0, approxChars);
              const chunkWidth = estimateWidth(chunk, seg.bold);
              currentPage.drawText(chunk, { x: currentX, y: currentY, size: fontSize, font: segFont, color });
              currentX += chunkWidth;
              token = token.slice(chunk.length);
              if (token.length > 0) {
                currentY -= lineHeight;
                ensureSpace();
                currentX = x;
              }
            }
          } else {
            const w = estimateWidth(token, seg.bold);
            if (currentX + w > maxX) {
              currentY -= lineHeight;
              ensureSpace();
              currentX = x;
            } else {
              currentPage.drawText(token, { x: currentX, y: currentY, size: fontSize, font: segFont, color });
              currentX += w;
            }
          }
        }
      }

      return { currentY, currentPage };
    };
    
    // Add header
    const headerText = `${documentType} Analysis`;
    const headerFontSize = 24;
    const headerWidth = headerText.length * headerFontSize * 0.6; // Rough estimation
    drawText(headerText, (width - headerWidth) / 2, currentY, boldFont, headerFontSize, rgb(0.2, 0.2, 0.2), page);
    currentY -= headerFontSize * 1.5;
    
    // Add address line (above Document: line)
    if (addressLine) {
      const addressText = `Address: ${sanitizeTextForPdf(addressLine)}`;
      const addressFontSize = 14;
      drawText(addressText, margin, currentY, font, addressFontSize, rgb(0.4, 0.4, 0.4), page);
      currentY -= addressFontSize * 1.5;
    }

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
      // Remove markdown bold markers and unsupported emoji
      const cleanLine = sanitizeTextForPdf(trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1'));
      
      if (!trimmedLine) {
        currentY -= 12; // Empty line spacing
        continue;
      }
      
      // Check if this is a heading (starts with # or is all caps)
      const isHeading = cleanLine.startsWith('#') || 
                       (cleanLine.length > 3 && cleanLine === cleanLine.toUpperCase() && !cleanLine.includes('.')) ||
                       cleanLine.match(/^[A-Z][a-z]+.*:$/);
      
      if (isHeading) {
        // Handle headings
        const headingText = sanitizeTextForPdf(trimmedLine.replace(/^#+\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1'));
        const headingFontSize = 16;
        const headingColor = rgb(0.2, 0.4, 0.6);
        
        const result = drawWrappedText(
          headingText,
          margin,
          currentY,
          boldFont,
          headingFontSize,
          contentWidth,
          headingColor,
          currentPage
        );
        currentY = result.currentY;
        currentPage = result.currentPage;
        currentY -= 8; // Extra spacing after heading
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Handle bullet points
        const bulletText = sanitizeTextForPdf(trimmedLine.substring(2).replace(/\*\*(.*?)\*\*/g, '$1'));
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
        const result = drawWrappedText(
          bulletText,
          margin + 15,
          currentY,
          font,
          bulletFontSize,
          contentWidth - 20,
          rgb(0.2, 0.2, 0.2),
          currentPage
        );
        currentY = result.currentY;
        currentPage = result.currentPage;
        currentY -= 4; // Spacing between bullet points
      } else if (trimmedLine.match(/^\d+\./)) {
        // Handle numbered lists
        const numberedText = sanitizeTextForPdf(trimmedLine.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1'));
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
        const result = drawWrappedText(
          numberedText,
          margin + 20,
          currentY,
          font,
          numberedFontSize,
          contentWidth - 30,
          rgb(0.2, 0.2, 0.2),
          currentPage
        );
        currentY = result.currentY;
        currentPage = result.currentPage;
        currentY -= 4; // Spacing between numbered items
      } else {
        // Regular paragraph text
        const paragraphFontSize = 12;
        const result = drawWrappedText(
          cleanLine,
          margin,
          currentY,
          font,
          paragraphFontSize,
          contentWidth,
          rgb(0.2, 0.2, 0.2),
          currentPage
        );
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
      const footerWidth = footerText.length * footerFontSize * 0.6; // Rough estimation
      
      page.drawText(footerText, {
        x: (width - footerWidth) / 2,
        y: 30,
        size: footerFontSize,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });
    });
    
    // Save the PDF
    console.log('Saving PDF document...');
    const pdfBytes = await pdfDoc.save();
    console.log('PDF saved successfully, bytes:', pdfBytes.length);
    return pdfBytes;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const downloadAnalysisPDF = async (analysisContent, documentType, documentTitle, addressLine) => {
  try {
    console.log('Starting PDF generation...', { documentType, documentTitle });
    const pdfBytes = await generateAnalysisPDF(analysisContent, documentType, documentTitle, addressLine);
    console.log('PDF generated successfully, size:', pdfBytes.length);
    
    // Create blob and download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const element = document.createElement('a');
    element.href = url;
    const baseName = `${documentType} Analysis`;
    const prefix = addressLine && addressLine.trim() ? `${addressLine.trim()} - ` : '';
    element.download = `${prefix}${baseName}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    // Clean up
    URL.revokeObjectURL(url);
    console.log('PDF download completed successfully');
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};
