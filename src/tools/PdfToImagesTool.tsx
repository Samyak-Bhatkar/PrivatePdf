import React, { useState } from 'react';
import {
  Image,
  Download,
  Archive,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import JSZip from 'jszip';
import { FileDropzone } from '../components/FileDropzone';
import { pdfjsLib, getPdfPageCount } from '../lib/pdfjs';
import { formatBytes } from '../utils/imageEngine';
import { addRecentProject } from '../utils/storage';

interface ExportedImage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
  size: number;
}

export const PdfToImagesTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [dpi, setDpi] = useState<'150' | '300'>('150');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [exportedImages, setExportedImages] = useState<ExportedImage[]>([]);

  const handleFileSelected = async (files: File[]) => {
    const target = files[0];
    if (!target) return;

    setFile(target);
    const buf = new Uint8Array(await target.arrayBuffer());
    setBuffer(buf);
    setExportedImages([]);

    try {
      const count = await getPdfPageCount(buf);
      setPageCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConvert = async () => {
    if (!buffer || !file) return;
    setIsProcessing(true);
    setProgressPct(5);

    try {
      const scale = dpi === '300' ? 3.0 : 1.5;
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';

      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const srcPdf = await loadingTask.promise;
      const count = srcPdf.numPages;

      const results: ExportedImage[] = [];

      for (let i = 1; i <= count; i++) {
        setProgressPct(Math.round(((i - 0.5) / count) * 90));
        const page = await srcPdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page.render({
          canvas: canvas as any,
          canvasContext: ctx,
          viewport,
        }) as any).promise;

        const dataUrl = canvas.toDataURL(mime, format === 'jpeg' ? 0.92 : undefined);
        const base64Data = dataUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: mime });

        results.push({
          pageNumber: i,
          dataUrl,
          blob,
          size: blob.size,
        });

        setProgressPct(Math.round((i / count) * 90));
      }

      setExportedImages(results);

      await addRecentProject({
        toolId: 'pdf-to-images',
        name: `${file.name.replace(/\.[^/.]+$/, '')}_images.zip`,
        itemCount: results.length,
        fileSizeTotal: results.reduce((a, b) => a + b.size, 0),
      });
    } catch (err: any) {
      console.error('Failed to convert PDF to images:', err);
      alert('Error converting PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
      setProgressPct(0);
    }
  };

  const handleDownloadSingle = (img: ExportedImage) => {
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const url = URL.createObjectURL(img.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, '')}_page_${img.pageNumber}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadAllZip = async () => {
    if (exportedImages.length === 0) return;
    const zip = new JSZip();
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    exportedImages.forEach((img) => {
      zip.file(`page_${img.pageNumber}.${ext}`, img.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, '')}_all_pages.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
              CONVERT
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              PDF to Images
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Convert every page of your PDF document into crisp, high-resolution JPG or PNG pictures.
          </p>
        </div>

        {exportedImages.length > 0 && (
          <button
            onClick={handleDownloadAllZip}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 transition"
          >
            <Archive className="h-4 w-4" />
            <span>Download All as ZIP</span>
          </button>
        )}
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF to extract images"
          subtitle="All pages will be rendered to pictures directly inside your browser"
        />
      ) : (
        <div className="space-y-6">
          {/* Options Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Image Format
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('jpeg')}
                    className={`rounded-xl py-2 text-xs font-semibold uppercase transition ${
                      format === 'jpeg'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'border border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    JPG (Smaller)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('png')}
                    className={`rounded-xl py-2 text-xs font-semibold uppercase transition ${
                      format === 'png'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'border border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  DPI Resolution
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDpi('150')}
                    className={`rounded-xl py-2 text-xs font-semibold transition ${
                      dpi === '150'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'border border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    150 DPI (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDpi('300')}
                    className={`rounded-xl py-2 text-xs font-semibold transition ${
                      dpi === '300'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'border border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    300 DPI (High-Res)
                  </button>
                </div>
              </div>
            </div>

            <button
              disabled={isProcessing}
              onClick={handleConvert}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
            >
              <Sparkles className="h-5 w-5" />
              <span>{isProcessing ? `Rendering Pages (${progressPct}%)...` : 'Convert to Images'}</span>
            </button>
          </div>

          {/* Exported Images Grid */}
          {exportedImages.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Rendered Images ({exportedImages.length})
                </h3>
                <button
                  onClick={handleDownloadAllZip}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline"
                >
                  <Archive className="h-4 w-4" />
                  <span>Download ZIP ({formatBytes(exportedImages.reduce((a, b) => a + b.size, 0))})</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {exportedImages.map((img) => (
                  <div
                    key={img.pageNumber}
                    className="flex flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-400">
                        {img.pageNumber}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatBytes(img.size)}</span>
                    </div>

                    <div className="aspect-3/4 overflow-hidden rounded bg-gray-50 flex items-center justify-center dark:bg-gray-950">
                      <img src={img.dataUrl} alt={`Page ${img.pageNumber}`} className="max-h-full object-contain" />
                    </div>

                    <button
                      onClick={() => handleDownloadSingle(img)}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <Download className="h-3.5 w-3.5 text-red-500" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
