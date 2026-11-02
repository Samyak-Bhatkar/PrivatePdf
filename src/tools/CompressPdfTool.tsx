import React, { useState } from 'react';
import {
  Minimize2,
  Sparkles,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { getPdfPageCount, pdfjsLib } from '../lib/pdfjs';
import { formatBytes } from '../utils/imageEngine';
import { addRecentProject } from '../utils/storage';

export const CompressPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const [preset, setPreset] = useState<'recommended' | 'extreme' | 'low'>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const [compressedBytes, setCompressedBytes] = useState<Uint8Array | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFileSelected = async (files: File[]) => {
    const target = files[0];
    if (!target) return;

    setFile(target);
    const buf = new Uint8Array(await target.arrayBuffer());
    setBuffer(buf);

    try {
      const count = await getPdfPageCount(buf);
      setPageCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompress = async () => {
    if (!buffer || !file) return;
    setIsProcessing(true);
    setProgressPct(5);

    try {
      // Configure DPI & JPEG quality based on preset
      let scale = 1.3;
      let quality = 0.72;

      if (preset === 'extreme') {
        scale = 0.95;
        quality = 0.50;
      } else if (preset === 'low') {
        scale = 1.8;
        quality = 0.85;
      }

      const pdfDoc = await PDFDocument.create();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const srcPdf = await loadingTask.promise;
      const totalPages = srcPdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        setProgressPct(Math.round(((i - 0.5) / totalPages) * 90));
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

        const imgDataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Data = imgDataUrl.split(',')[1];
        const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const embedded = await pdfDoc.embedJpg(imgBytes);
        // Original page standard size in points
        const origView = page.getViewport({ scale: 1 });
        const newPage = pdfDoc.addPage([origView.width, origView.height]);

        newPage.drawImage(embedded, {
          x: 0,
          y: 0,
          width: origView.width,
          height: origView.height,
        });

        setProgressPct(Math.round((i / totalPages) * 90));
      }

      const resultBytes = await pdfDoc.save();
      setCompressedBytes(resultBytes);
      setIsPreviewOpen(true);

      await addRecentProject({
        toolId: 'compress-pdf',
        name: `${file.name.replace(/\.[^/.]+$/, '')}_compressed.pdf`,
        itemCount: totalPages,
        fileSizeTotal: resultBytes.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to compress PDF:', err);
      alert('Error compressing PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
      setProgressPct(0);
    }
  };

  const originalSize = file?.size || 0;
  const compressedSize = compressedBytes?.byteLength || 0;
  const savedPct =
    originalSize > 0 && compressedSize > 0
      ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
              OPTIMIZE
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Compress PDF Size
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Reduce PDF file size locally in your browser while preserving optimal visual clarity.
          </p>
        </div>
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF to compress"
          subtitle="Choose the PDF file you want to reduce the size of"
        />
      ) : (
        <div className="space-y-6">
          {/* File summary card */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">{file?.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {pageCount} {pageCount === 1 ? 'Page' : 'Pages'} • Original Size:{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {formatBytes(originalSize)}
                </span>
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setBuffer(null);
                setCompressedBytes(null);
              }}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Change File
            </button>
          </div>

          {/* Compression Presets */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                id: 'extreme',
                title: 'Extreme Compression',
                subtitle: 'Lowest size, fair quality (~100 DPI)',
                saving: 'Max space saver',
              },
              {
                id: 'recommended',
                title: 'Recommended',
                subtitle: 'Great quality, high compression (~150 DPI)',
                saving: 'Most popular',
              },
              {
                id: 'low',
                title: 'Low Compression',
                subtitle: 'High quality, slight reduction (~200 DPI)',
                saving: 'High fidelity',
              },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id as any)}
                className={`relative flex flex-col rounded-3xl p-5 text-left border transition ${
                  preset === p.id
                    ? 'border-red-500 bg-red-50/60 ring-2 ring-red-500/20 dark:bg-red-950/20'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/60'
                }`}
              >
                {p.id === 'recommended' && (
                  <span className="absolute top-3 right-3 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                    Recommended
                  </span>
                )}
                <span className="text-sm font-bold text-gray-900 dark:text-white">{p.title}</span>
                <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{p.subtitle}</span>
                <span className="mt-4 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {p.saving}
                </span>
              </button>
            ))}
          </div>

          {/* Before & After comparison if already compressed */}
          {compressedBytes && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Successfully Compressed! Saved {savedPct}% of file size
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      From {formatBytes(originalSize)} down to {formatBytes(compressedSize)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                >
                  Download / Preview
                </button>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            disabled={isProcessing}
            onClick={handleCompress}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
          >
            <Sparkles className="h-5 w-5" />
            <span>{isProcessing ? `Compressing (${progressPct}%)...` : 'Compress PDF'}</span>
          </button>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={compressedBytes}
        filename={`${file?.name.replace(/\.[^/.]+$/, '')}_compressed.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
