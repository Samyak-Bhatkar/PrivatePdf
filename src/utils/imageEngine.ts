import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { ImageItem, ImageToPdfSettings } from '../types';
import { calculatePageDimensions, calculateImagePlacement, hexToRgbPdf } from './pdfEngine';

/**
 * Pure image file format check
 */
export function isSupportedImage(file: File): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/heic',
    'image/heif',
  ];
  return (
    validTypes.includes(file.type.toLowerCase()) ||
    /\.(jpe?g|png|webp|gif|bmp|svg|heic|heif)$/i.test(file.name)
  );
}

/**
 * Format bytes to readable string (e.g., 2.4 MB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Process image with canvas filters (brightness, contrast, scan mode, rotation, crop)
 * Returns a JPEG/PNG Blob or data URL
 */
export async function processImageCanvas(
  imageItem: ImageItem,
  exportQuality: number = 0.9,
  outputType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<{ blob: Blob; width: number; height: number; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let srcX = 0;
      let srcY = 0;
      let srcWidth = img.naturalWidth;
      let srcHeight = img.naturalHeight;

      if (imageItem.cropBox) {
        srcX = imageItem.cropBox.x;
        srcY = imageItem.cropBox.y;
        srcWidth = imageItem.cropBox.width;
        srcHeight = imageItem.cropBox.height;
      }

      const canvas = document.createElement('canvas');
      const rot = (imageItem.rotation || 0) % 360;
      const is90or270 = rot === 90 || rot === 270;

      canvas.width = is90or270 ? srcHeight : srcWidth;
      canvas.height = is90or270 ? srcWidth : srcHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get 2D canvas context'));
      }

      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Translate & rotate
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);

      // Draw cropped slice of original
      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcWidth,
        srcHeight,
        -srcWidth / 2,
        -srcHeight / 2,
        srcWidth,
        srcHeight
      );
      ctx.restore();

      // Apply image filters (brightness, contrast, scan mode)
      const brightness = imageItem.brightness ?? 1.0;
      const contrast = imageItem.contrast ?? 1.0;
      const filterMode = imageItem.filterMode || 'normal';

      if (brightness !== 1.0 || contrast !== 1.0 || filterMode !== 'normal') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          let r = d[i];
          let g = d[i + 1];
          let b = d[i + 2];

          // 1. Brightness
          if (brightness !== 1.0) {
            r = r * brightness;
            g = g * brightness;
            b = b * brightness;
          }

          // 2. Contrast
          if (contrast !== 1.0) {
            r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
          }

          // 3. Scan Filters
          if (filterMode === 'grayscale') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = gray;
          } else if (filterMode === 'scan') {
            // Document Scan filter: auto-levels & boost contrast for crisp text
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            // curve: push whites to 255, darks to black
            if (gray > 165) gray = 255;
            else if (gray < 85) gray = Math.max(0, gray * 0.7);
            else gray = ((gray - 85) / 80) * 255;
            r = g = b = gray;
          } else if (filterMode === 'bw') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const bw = gray > 140 ? 255 : 0;
            r = g = b = bw;
          }

          d[i] = Math.min(255, Math.max(0, r));
          d[i + 1] = Math.min(255, Math.max(0, g));
          d[i + 2] = Math.min(255, Math.max(0, b));
        }

        ctx.putImageData(imgData, 0, 0);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Failed to create Blob from canvas'));
          const dataUrl = canvas.toDataURL(outputType, exportQuality);
          resolve({
            blob,
            width: canvas.width,
            height: canvas.height,
            dataUrl,
          });
        },
        outputType,
        exportQuality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image for canvas processing'));
    img.src = imageItem.previewUrl;
  });
}

/**
 * Convert an array of ImageItems into a single merged PDF Document
 */
export async function convertImagesToPdf(
  images: ImageItem[],
  settings: ImageToPdfSettings,
  onProgress?: (progressPct: number, currentItem: number, total: number) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Determine quality level
  let qualityMultiplier = 0.9;
  if (settings.quality === 'original') qualityMultiplier = 0.98;
  else if (settings.quality === 'high') qualityMultiplier = 0.88;
  else if (settings.quality === 'medium') qualityMultiplier = 0.72;
  else if (settings.quality === 'low') qualityMultiplier = 0.50;

  // Margin pt
  let marginPt = 0;
  if (settings.margin === 'small') marginPt = 18;
  else if (settings.margin === 'big') marginPt = 36;
  else if (settings.margin === 'custom') marginPt = settings.customMarginPt;

  const bgRgb = hexToRgbPdf(settings.bgColor || '#ffffff');
  const textColor = rgb(0.2, 0.2, 0.2);

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / images.length) * 100), i + 1, images.length);
    }

    // Process image to high quality jpeg bytes
    const processed = await processImageCanvas(item, qualityMultiplier, 'image/jpeg');
    const imageBytes = new Uint8Array(await processed.blob.arrayBuffer());

    const embeddedImage = await pdfDoc.embedJpg(imageBytes);

    // Calculate Page Dimensions
    const dims = calculatePageDimensions(
      settings.pageSize,
      settings.orientation,
      embeddedImage.width,
      embeddedImage.height
    );

    const page = pdfDoc.addPage([dims.width, dims.height]);

    // Draw background if not pure white
    if (settings.bgColor && settings.bgColor.toLowerCase() !== '#ffffff') {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: dims.width,
        height: dims.height,
        color: bgRgb,
      });
    }

    // Calculate placement
    const placement = calculateImagePlacement(
      dims.width,
      dims.height,
      embeddedImage.width,
      embeddedImage.height,
      marginPt,
      settings.fit
    );

    page.drawImage(embeddedImage, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    });

    // Optional Header Text
    if (settings.headerText?.trim()) {
      page.drawText(settings.headerText.trim(), {
        x: marginPt > 0 ? marginPt : 24,
        y: dims.height - 18,
        size: 9,
        font,
        color: textColor,
      });
    }

    // Optional Footer Text
    if (settings.footerText?.trim()) {
      page.drawText(settings.footerText.trim(), {
        x: marginPt > 0 ? marginPt : 24,
        y: 12,
        size: 9,
        font,
        color: textColor,
      });
    }

    // Page Numbers
    if (settings.pageNumbers && settings.pageNumbers !== 'none') {
      const pageStr = `${i + 1} / ${images.length}`;
      const textWidth = font.widthOfTextAtSize(pageStr, 9);

      let pX = (dims.width - textWidth) / 2;
      let pY = 12;

      if (settings.pageNumbers === 'bottom-right') {
        pX = dims.width - textWidth - (marginPt > 0 ? marginPt : 24);
      } else if (settings.pageNumbers === 'top-center') {
        pY = dims.height - 18;
      }

      page.drawText(pageStr, {
        x: pX,
        y: pY,
        size: 9,
        font,
        color: textColor,
      });
    }
  }

  return await pdfDoc.save();
}
