import { PDFDocument, rgb, degrees, StandardFonts, PDFPage } from 'pdf-lib';
import type { PageSizeOption, PageOrientation, ImageFitOption } from '../types';

export const PAGE_SIZES: Record<Exclude<PageSizeOption, 'Fit'>, { width: number; height: number }> = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  A3: { width: 841.89, height: 1190.55 },
  A5: { width: 419.53, height: 595.28 },
};

/**
 * Pure function: Parse page range strings like "1-3, 5, 8-10" into 0-indexed page indices.
 * Validates against maxPages.
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const result = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(totalPages, Math.max(start, end));
        for (let p = from; p <= to; p++) {
          result.add(p - 1); // 0-indexed
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        result.add(pageNum - 1);
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Pure function: calculate page dimensions based on size, orientation, and image size
 */
export function calculatePageDimensions(
  pageSize: PageSizeOption,
  orientation: PageOrientation,
  imgWidth: number,
  imgHeight: number
): { width: number; height: number } {
  if (pageSize === 'Fit') {
    return { width: imgWidth, height: imgHeight };
  }

  const base = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  let targetWidth = base.width;
  let targetHeight = base.height;

  if (orientation === 'landscape') {
    targetWidth = Math.max(base.width, base.height);
    targetHeight = Math.min(base.width, base.height);
  } else if (orientation === 'portrait') {
    targetWidth = Math.min(base.width, base.height);
    targetHeight = Math.max(base.width, base.height);
  } else if (orientation === 'auto') {
    // Match image aspect ratio
    const isImgLandscape = imgWidth > imgHeight;
    if (isImgLandscape) {
      targetWidth = Math.max(base.width, base.height);
      targetHeight = Math.min(base.width, base.height);
    } else {
      targetWidth = Math.min(base.width, base.height);
      targetHeight = Math.max(base.width, base.height);
    }
  }

  return { width: targetWidth, height: targetHeight };
}

/**
 * Pure function: calculate image placement within page bounds considering margin and fit mode
 */
export function calculateImagePlacement(
  pageWidth: number,
  pageHeight: number,
  imgWidth: number,
  imgHeight: number,
  marginPt: number,
  fit: ImageFitOption
): { x: number; y: number; width: number; height: number } {
  const availWidth = Math.max(10, pageWidth - marginPt * 2);
  const availHeight = Math.max(10, pageHeight - marginPt * 2);

  let drawWidth = availWidth;
  let drawHeight = availHeight;

  if (fit === 'fit') {
    const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
    drawWidth = imgWidth * scale;
    drawHeight = imgHeight * scale;
  } else if (fit === 'fill') {
    const scale = Math.max(availWidth / imgWidth, availHeight / imgHeight);
    drawWidth = imgWidth * scale;
    drawHeight = imgHeight * scale;
  } else if (fit === 'center') {
    // 1:1 scale centered unless it overflows
    const scale = Math.min(1, Math.min(availWidth / imgWidth, availHeight / imgHeight));
    drawWidth = imgWidth * scale;
    drawHeight = imgHeight * scale;
  } else if (fit === 'stretch') {
    drawWidth = availWidth;
    drawHeight = availHeight;
  }

  const x = marginPt + (availWidth - drawWidth) / 2;
  const y = marginPt + (availHeight - drawHeight) / 2;

  return { x, y, width: drawWidth, height: drawHeight };
}

/**
 * Helper to convert hex color #RRGGBB to pdf-lib rgb(r, g, b)
 */
export function hexToRgbPdf(hex: string): ReturnType<typeof rgb> {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return rgb(1, 1, 1);
}

/**
 * Merge multiple PDF byte arrays into a single PDF
 */
export async function mergePdfDocuments(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return await mergedPdf.save();
}

/**
 * Split a PDF document into multiple documents by page indices
 */
export async function splitPdfByPageIndices(
  pdfBuffer: Uint8Array,
  pageIndicesGroups: number[][]
): Promise<Uint8Array[]> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const results: Uint8Array[] = [];

  for (const group of pageIndicesGroups) {
    if (group.length === 0) continue;
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, group);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }
    results.push(await newDoc.save());
  }

  return results;
}

/**
 * Reorder, rotate, or delete pages in a PDF document
 */
export async function organizePdfDocument(
  pdfBuffer: Uint8Array,
  pageOps: Array<{
    sourcePageIndex: number;
    rotationDelta: number; // 0, 90, 180, 270
    isBlank?: boolean;
    blankWidth?: number;
    blankHeight?: number;
  }>
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const op of pageOps) {
    if (op.isBlank) {
      const w = op.blankWidth || 595.28;
      const h = op.blankHeight || 841.89;
      newDoc.addPage([w, h]);
    } else {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [op.sourcePageIndex]);
      if (op.rotationDelta) {
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRotation + op.rotationDelta) % 360));
      }
      newDoc.addPage(copiedPage);
    }
  }

  return await newDoc.save();
}

/**
 * Add page numbers to an existing PDF
 */
export async function addPageNumbersToPdf(
  pdfBuffer: Uint8Array,
  options: {
    format: 'n' | 'n_of_total' | 'page_n' | 'page_n_of_total';
    position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
    fontSize?: number;
    colorHex?: string;
    marginPt?: number;
    startNumber?: number;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const totalPages = pdfDoc.getPageCount();
  const fontSize = options.fontSize || 10;
  const color = hexToRgbPdf(options.colorHex || '#555555');
  const margin = options.marginPt ?? 24;
  const startNum = options.startNumber ?? 1;

  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const currentNum = startNum + i;

    let text = `${currentNum}`;
    if (options.format === 'n_of_total') text = `${currentNum} / ${totalPages}`;
    else if (options.format === 'page_n') text = `Page ${currentNum}`;
    else if (options.format === 'page_n_of_total') text = `Page ${currentNum} of ${totalPages}`;

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = (width - textWidth) / 2;
    let y = margin;

    if (options.position === 'bottom-left') x = margin;
    else if (options.position === 'bottom-right') x = width - textWidth - margin;
    else if (options.position === 'top-left') {
      x = margin;
      y = height - margin;
    } else if (options.position === 'top-center') {
      x = (width - textWidth) / 2;
      y = height - margin;
    } else if (options.position === 'top-right') {
      x = width - textWidth - margin;
      y = height - margin;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color,
    });
  }

  return await pdfDoc.save();
}

/**
 * Add watermark (Text or Image) to a PDF
 */
export async function addWatermarkToPdf(
  pdfBuffer: Uint8Array,
  options: {
    type: 'text' | 'image';
    text?: string;
    fontSize?: number;
    opacity?: number;
    rotationDegrees?: number;
    colorHex?: string;
    imageBytes?: Uint8Array;
    imageType?: 'png' | 'jpg';
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const opacity = options.opacity ?? 0.3;

  if (options.type === 'text' && options.text) {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = options.fontSize || 48;
    const color = hexToRgbPdf(options.colorHex || '#888888');
    const rot = options.rotationDegrees ?? 45;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(options.text, fontSize);
      page.drawText(options.text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: fontSize,
        font,
        color,
        opacity,
        rotate: degrees(rot),
      });
    }
  } else if (options.type === 'image' && options.imageBytes) {
    let embeddedImg;
    if (options.imageType === 'png') {
      embeddedImg = await pdfDoc.embedPng(options.imageBytes);
    } else {
      embeddedImg = await pdfDoc.embedJpg(options.imageBytes);
    }

    for (const page of pages) {
      const { width, height } = page.getSize();
      const imgDims = embeddedImg.scaleToFit(width * 0.6, height * 0.6);
      page.drawImage(embeddedImg, {
        x: (width - imgDims.width) / 2,
        y: (height - imgDims.height) / 2,
        width: imgDims.width,
        height: imgDims.height,
        opacity,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Rotate PDF pages by 90, 180, or 270 degrees
 */
export async function rotatePdfPages(
  pdfBuffer: Uint8Array,
  rotationAngle: 90 | 180 | 270,
  pageIndices?: number[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const targetIndices = new Set(pageIndices ?? pages.map((_, i) => i));

  pages.forEach((page, idx) => {
    if (targetIndices.has(idx)) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + rotationAngle) % 360));
    }
  });

  return await pdfDoc.save();
}

/**
 * Crop PDF pages by setting MediaBox and CropBox
 */
export async function cropPdfPages(
  pdfBuffer: Uint8Array,
  cropMarginPct: { top: number; bottom: number; left: number; right: number },
  pageIndices?: number[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const targetIndices = new Set(pageIndices ?? pages.map((_, i) => i));

  pages.forEach((page, idx) => {
    if (targetIndices.has(idx)) {
      const { width, height } = page.getSize();
      const leftInset = (width * cropMarginPct.left) / 100;
      const rightInset = (width * cropMarginPct.right) / 100;
      const topInset = (height * cropMarginPct.top) / 100;
      const bottomInset = (height * cropMarginPct.bottom) / 100;

      const newX = leftInset;
      const newY = bottomInset;
      const newWidth = Math.max(20, width - leftInset - rightInset);
      const newHeight = Math.max(20, height - topInset - bottomInset);

      page.setCropBox(newX, newY, newWidth, newHeight);
      page.setMediaBox(newX, newY, newWidth, newHeight);
    }
  });

  return await pdfDoc.save();
}

/**
 * Stamp signature image onto a PDF page
 */
export async function signPdfPage(
  pdfBuffer: Uint8Array,
  signaturePngBytes: Uint8Array,
  placement: {
    pageIndex: number;
    xPct: number; // 0 to 100 from left
    yPct: number; // 0 to 100 from bottom
    widthPct: number; // percentage of page width
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const page = pdfDoc.getPage(placement.pageIndex);
  const { width, height } = page.getSize();

  const signatureImage = await pdfDoc.embedPng(signaturePngBytes);
  const targetWidth = (width * placement.widthPct) / 100;
  const aspectRatio = signatureImage.height / signatureImage.width;
  const targetHeight = targetWidth * aspectRatio;

  const x = (width * placement.xPct) / 100;
  const y = (height * placement.yPct) / 100;

  page.drawImage(signatureImage, {
    x,
    y,
    width: targetWidth,
    height: targetHeight,
  });

  return await pdfDoc.save();
}
