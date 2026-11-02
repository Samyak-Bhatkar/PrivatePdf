import * as pdfjsLib from 'pdfjs-dist';

// Point to the local worker in public directory so it works offline with zero CDN dependencies
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export { pdfjsLib };

/**
 * Render a specific page from a PDF File or ArrayBuffer to an HTMLCanvasElement or data URL
 */
export async function renderPdfPageToDataUrl(
  pdfData: ArrayBuffer | Uint8Array,
  pageNumber: number = 1,
  scale: number = 1.0
): Promise<string> {
  const dataCopy = new Uint8Array(pdfData).slice();
  const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNumber);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Set white background before rendering
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await (page.render({
    canvas: canvas as any,
    canvasContext: ctx,
    viewport,
  }) as any).promise;

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Get total page count from a PDF buffer
 */
export async function getPdfPageCount(pdfData: ArrayBuffer | Uint8Array): Promise<number> {
  const dataCopy = new Uint8Array(pdfData).slice();
  const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
  const pdfDoc = await loadingTask.promise;
  return pdfDoc.numPages;
}
