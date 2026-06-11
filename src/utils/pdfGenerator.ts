/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { NUpCard, MergedFile, ImageSlide, PageLayout, PaperSize, PaperOrientation } from '../types';

// Helper to wrap text based on width and font
function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  const paragraphs = text.split('\n');
  const resultLines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      resultLines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth) {
        if (currentLine) {
          resultLines.push(currentLine);
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }
  return resultLines;
}

// Convert Hex color to RGB object for pdf-lib [0-1]
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0.9;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0.9;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0.9;
  return { r, g, b };
}

/**
 * Generates an N-Up PDF document featuring 1-Up, 2-Up, 4-Up, or 6-Up grid configurations.
 */
export async function generateNUpPdf(
  cards: NUpCard[],
  layout: PageLayout,
  paperSize: PaperSize,
  orientation: PaperOrientation
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // Standard point measurements: A4 (595.27 x 841.89), Letter (612 x 792)
  let baseWidth = paperSize === 'A4' ? 595.27 : 612;
  let baseHeight = paperSize === 'A4' ? 841.89 : 792;

  // Swap dimensions if orientation is landscape
  if (orientation === 'landscape') {
    const temp = baseWidth;
    baseWidth = baseHeight;
    baseHeight = temp;
  }

  // Load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Layout parameters
  let cols = 1;
  let rows = 1;

  switch (layout) {
    case '2-up':
      if (orientation === 'landscape') {
        cols = 2; rows = 1;
      } else {
        cols = 1; rows = 2;
      }
      break;
    case '4-up':
      cols = 2; rows = 2;
      break;
    case '6-up':
      cols = 2; rows = 3;
      break;
    case '1-up':
    default:
      cols = 1; rows = 1;
      break;
  }

  const itemsPerPage = cols * rows;
  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  // Chunk items
  for (let i = 0; i < sortedCards.length; i += itemsPerPage) {
    const chunk = sortedCards.slice(i, i + itemsPerPage);
    const page = pdfDoc.addPage([baseWidth, baseHeight]);

    // Margins
    const pageMargin = 24;
    const gap = 16;

    const availableWidth = baseWidth - (pageMargin * 2) - (gap * (cols - 1));
    const availableHeight = baseHeight - (pageMargin * 2) - (gap * (rows - 1));

    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;

    for (let index = 0; index < chunk.length; index++) {
      const card = chunk[index];
      
      // Calculate layout coordinates
      // pdf-lib's origin is at the bottom-left corner of the page (0, 0)
      const colIndex = index % cols;
      const rowIndex = Math.floor(index / cols); 

      // On vertical stack, start drawing from top row downwards
      const visualRowIndex = rows - 1 - rowIndex;

      const x = pageMargin + (colIndex * (cellWidth + gap));
      const y = pageMargin + (visualRowIndex * (cellHeight + gap));

      // Fetch colors
      const rgbBg = hexToRgb(card.accentColor);

      // Draw background card shadow/border
      page.drawRectangle({
        x: x,
        y: y,
        width: cellWidth,
        height: cellHeight,
        color: rgb(rgbBg.r, rgbBg.g, rgbBg.b),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1.5,
      });

      // Add a subtle white content well inside
      const padding = 14;
      page.drawRectangle({
        x: x + 8,
        y: y + 8,
        width: cellWidth - 16,
        height: cellHeight - 16,
        color: rgb(1, 1, 1),
      });

      // Render Text Content
      const innerX = x + padding + 8;
      const innerYStart = y + cellHeight - padding - 12;
      const innerWidth = cellWidth - (padding * 2) - 16;

      // Card Title
      const titleFontSize = layout === '1-up' ? 18 : layout === '2-up' ? 14 : 11;
      const contentFontSize = layout === '1-up' ? 12 : layout === '2-up' ? 10 : 8.5;

      // Draw active indicator color stripe in inner card top
      page.drawRectangle({
        x: x + 12,
        y: innerYStart + 2,
        width: cellWidth - 24,
        height: 4,
        color: rgb(rgbBg.r, rgbBg.g, rgbBg.b),
      });

      const titleX = innerX;
      const titleY = innerYStart - 12;

      page.drawText(card.title || 'Untitled Card', {
        x: titleX,
        y: titleY,
        size: titleFontSize,
        font: helveticaBold,
        color: rgb(0.12, 0.12, 0.12),
      });

      // Helper Text line
      const textDividerY = titleY - 8;
      page.drawLine({
        start: { x: titleX, y: textDividerY },
        end: { x: titleX + innerWidth, y: textDividerY },
        color: rgb(0.9, 0.9, 0.9),
        thickness: 0.5,
      });

      // Card Content Body
      const wrappedContent = wrapText(
        card.content || '',
        innerWidth,
        contentFontSize,
        helveticaFont
      );

      let currentLineY = textDividerY - 14;
      const maxLines = Math.floor((currentLineY - (y + 12)) / (contentFontSize + 4));

      for (let lineIdx = 0; lineIdx < Math.min(wrappedContent.length, maxLines); lineIdx++) {
        const line = wrappedContent[lineIdx];
        page.drawText(line, {
          x: titleX,
          y: currentLineY,
          size: contentFontSize,
          font: helveticaFont,
          color: rgb(0.24, 0.24, 0.24),
        });
        currentLineY -= contentFontSize + 4;
      }

      // If text truncated
      if (wrappedContent.length > maxLines) {
        page.drawText('...', {
          x: titleX,
          y: currentLineY,
          size: contentFontSize,
          font: helveticaBold,
          color: rgb(0.6, 0.6, 0.6),
        });
      }

      // Draw tiny sequence counter
      const counterText = `#${card.order + 1}`;
      page.drawText(counterText, {
        x: x + cellWidth - padding - 14,
        y: y + padding + 2,
        size: 7,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Utility to extract total page count from a PDF file using pdf-lib in-browser.
 */
export async function getPdfDetails(file: File): Promise<{ pageCount: number }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadedPdf = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
    return {
      pageCount: loadedPdf.getPageCount(),
    };
  } catch (error) {
    console.error('Error parsing PDF details:', error);
    return { pageCount: 1 };
  }
}

/**
 * Combines multiple PDF files into one clean document, preserving order.
 */
export async function mergePdfs(mergedFiles: MergedFile[]): Promise<Uint8Array> {
  const mergedPdfDoc = await PDFDocument.create();
  
  // Sort by defined order
  const sortedFiles = [...mergedFiles].sort((a, b) => a.order - b.order);

  for (const fileItem of sortedFiles) {
    try {
      const bytes = await fileItem.file.arrayBuffer();
      const currentPdf = await PDFDocument.load(bytes);
      const pages = await mergedPdfDoc.copyPages(currentPdf, currentPdf.getPageIndices());
      
      pages.forEach((page) => {
        mergedPdfDoc.addPage(page);
      });
    } catch (err) {
      console.error(`Failed to load or copy pages for: ${fileItem.name}`, err);
    }
  }

  return await mergedPdfDoc.save();
}

/**
 * Creates a high-fidelity PDF from an ordered list of ImageSlide items.
 */
export async function generateImagesToPdf(
  slides: ImageSlide[],
  paperSize: PaperSize,
  orientation: PaperOrientation
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  let baseWidth = paperSize === 'A4' ? 595.27 : 612;
  let baseHeight = paperSize === 'A4' ? 841.89 : 792;

  if (orientation === 'landscape') {
    const temp = baseWidth;
    baseWidth = baseHeight;
    baseHeight = temp;
  }

  const sortedSlides = [...slides].sort((a, b) => a.order - b.order);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const slide of sortedSlides) {
    try {
      const page = pdfDoc.addPage([baseWidth, baseHeight]);
      const imageBytes = await slide.file.arrayBuffer();
      
      let embeddedImage;
      const lowercaseName = slide.name.toLowerCase();
      
      if (slide.file.type === 'image/png' || lowercaseName.endsWith('.png')) {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        // Embed JPG or JPEG (handles scaling metadata nicely)
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      // Handle Margins and Frame structures based on style
      let margin = 0;
      let drawPolaroidFrame = false;

      if (slide.borderStyle === 'classic') {
        margin = 32;
      } else if (slide.borderStyle === 'polaroid') {
        margin = 36;
        drawPolaroidFrame = true;
      }

      // Calculate safe fit bounding size
      const limitWidth = baseWidth - (margin * 2);
      const limitHeight = drawPolaroidFrame 
        ? baseHeight - (margin * 2) - 60 // Leave space for captions at bottom
        : baseHeight - (margin * 2);

      // Calculate scaling maintains aspect ratio
      const widthScale = limitWidth / imgWidth;
      const heightScale = limitHeight / imgHeight;
      const finalScale = Math.min(widthScale, heightScale, 1.0); // Don't upscale past native dimensions for clarity

      const drawWidth = imgWidth * finalScale;
      const drawHeight = imgHeight * finalScale;

      // Coordinates to center image within limit boundaries
      const xOffset = margin + (limitWidth - drawWidth) / 2;
      const yOffset = drawPolaroidFrame
        ? margin + 60 + (limitHeight - drawHeight) / 2 // pushed up
        : margin + (limitHeight - drawHeight) / 2;

      if (drawPolaroidFrame) {
        // Draw elegant Polaroid styling: nice solid white background with shadows
        page.drawRectangle({
          x: margin / 2,
          y: margin / 2,
          width: baseWidth - margin,
          height: baseHeight - margin,
          color: rgb(0.98, 0.98, 0.97),
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 1.5,
        });

        // Draw the inner image
        page.drawImage(embeddedImage, {
          x: xOffset,
          y: yOffset,
          width: drawWidth,
          height: drawHeight,
        });

        // Frame spacer line
        page.drawLine({
          start: { x: margin, y: margin + 48 },
          end: { x: baseWidth - margin, y: margin + 48 },
          color: rgb(0.9, 0.9, 0.9),
          thickness: 1,
        });

        // Draw caption
        const captionText = slide.name.substring(0, 32);
        const textWidth = helveticaFont.widthOfTextAtSize(captionText, 11);
        page.drawText(captionText, {
          x: (baseWidth - textWidth) / 2,
          y: margin + 20,
          size: 11,
          font: helveticaFont,
          color: rgb(0.2, 0.2, 0.2),
        });
      } else {
        // Classic Border or Full-Bleed
        if (slide.borderStyle === 'classic') {
          // Draw subtle background border line
          page.drawRectangle({
            x: margin / 2,
            y: margin / 2,
            width: baseWidth - margin,
            height: baseHeight - margin,
            borderColor: rgb(0.9, 0.9, 0.9),
            borderWidth: 1,
          });
        }

        page.drawImage(embeddedImage, {
          x: xOffset,
          y: yOffset,
          width: drawWidth,
          height: drawHeight,
        });
      }
    } catch (err) {
      console.error(`Failed to process image slide: ${slide.name}`, err);
    }
  }

  return await pdfDoc.save();
}

/**
 * Takes an uploaded PDF, embeds its pages, and aggregates them into a customized N-Up layout.
 */
export async function generatePdfNUp(
  pdfFile: File,
  layout: PageLayout | '9-up',
  paperSize: PaperSize,
  orientation: PaperOrientation,
  drawPageBorders = true,
  pageNumbersEnabled = true,
  useWholePdf = true,
  startPage = 1,
  endPage = 1
): Promise<Uint8Array> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer);
  let srcPages = srcDoc.getPages();
  
  const startIdx = !useWholePdf ? Math.max(0, startPage - 1) : 0;
  if (!useWholePdf) {
    srcPages = srcPages.slice(startIdx, Math.min(srcPages.length, endPage));
  }

  const pdfDoc = await PDFDocument.create();
  const embeddedPages = await pdfDoc.embedPages(srcPages);
  
  let baseWidth = paperSize === 'A4' ? 595.27 : 612;
  let baseHeight = paperSize === 'A4' ? 841.89 : 792;

  if (orientation === 'landscape') {
    const temp = baseWidth;
    baseWidth = baseHeight;
    baseHeight = temp;
  }

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let cols = 1;
  let rows = 1;

  switch (layout) {
    case '2-up':
      if (orientation === 'landscape') {
        cols = 2; rows = 1;
      } else {
        cols = 1; rows = 2;
      }
      break;
    case '4-up':
      cols = 2; rows = 2;
      break;
    case '6-up':
      cols = 2; rows = 3;
      break;
    case '9-up':
      cols = 3; rows = 3;
      break;
    case '1-up':
    default:
      cols = 1; rows = 1;
      break;
  }

  const itemsPerPage = cols * rows;

  for (let i = 0; i < embeddedPages.length; i += itemsPerPage) {
    const chunk = embeddedPages.slice(i, i + itemsPerPage);
    const targetPage = pdfDoc.addPage([baseWidth, baseHeight]);

    // Margins and gutters
    const pageMargin = 20;
    const gap = 16;

    const availableWidth = baseWidth - (pageMargin * 2) - (gap * (cols - 1));
    const availableHeight = baseHeight - (pageMargin * 2) - (gap * (rows - 1));

    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;

    for (let index = 0; index < chunk.length; index++) {
      const embeddedPage = chunk[index];
      const sourcePageIndex = startIdx + i + index + 1;

      const colIndex = index % cols;
      const rowIndex = Math.floor(index / cols);

      // Origin of pdf-lib is bottom-left
      const visualRowIndex = rows - 1 - rowIndex;

      const cellX = pageMargin + (colIndex * (cellWidth + gap));
      const cellY = pageMargin + (visualRowIndex * (cellHeight + gap));

      const embeddedWidth = embeddedPage.width;
      const embeddedHeight = embeddedPage.height;
      const srcRatio = embeddedWidth / embeddedHeight;
      const cellRatio = cellWidth / cellHeight;

      let drawWidth = cellWidth;
      let drawHeight = cellHeight;

      if (srcRatio > cellRatio) {
        drawHeight = cellWidth / srcRatio;
      } else {
        drawWidth = cellHeight * srcRatio;
      }

      const x = cellX + (cellWidth - drawWidth) / 2;
      const y = cellY + (cellHeight - drawHeight) / 2;

      targetPage.drawPage(embeddedPage, {
        x: x,
        y: y,
        width: drawWidth,
        height: drawHeight,
      });

      if (drawPageBorders) {
        targetPage.drawRectangle({
          x: x,
          y: y,
          width: drawWidth,
          height: drawHeight,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 0.5,
        });
      }

      if (pageNumbersEnabled) {
        const text = `Original Page ${sourcePageIndex}`;
        const fontSize = layout === '1-up' ? 8 : 6.5;
        const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
        targetPage.drawText(text, {
          x: x + (drawWidth - textWidth) / 2,
          y: y - fontSize - 2 > cellY ? y - fontSize - 2 : y + 2,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }
  }

  return await pdfDoc.save();
}

