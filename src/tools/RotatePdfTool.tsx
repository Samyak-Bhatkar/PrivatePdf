import React, { useState } from 'react';
import { RotateCw, RotateCcw, Sparkles } from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { getPdfPageCount, renderPdfPageToDataUrl } from '../lib/pdfjs';
import { rotatePdfPages } from '../utils/pdfEngine';
import { addRecentProject } from '../utils/storage';

export const RotatePdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [previewThumb, setPreviewThumb] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
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
      const thumb = await renderPdfPageToDataUrl(buf, 1, 0.4);
      setPreviewThumb(thumb);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRotate = async () => {
    if (!buffer || !file) return;
    setIsProcessing(true);

    try {
      const rotated = await rotatePdfPages(buffer, rotationAngle);
      setResultBytes(rotated);
      setIsPreviewOpen(true);

      await addRecentProject({
        toolId: 'rotate-pdf',
        name: `${file.name.replace(/\.[^/.]+$/, '')}_rotated.pdf`,
        itemCount: pageCount,
        fileSizeTotal: rotated.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to rotate PDF:', err);
      alert('Error rotating PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
            EDIT
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Rotate PDF
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Rotate your PDF pages permanently by 90°, 180°, or 270° clockwise or counterclockwise.
        </p>
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF to rotate"
          subtitle="All pages will be rotated permanently"
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Preview Thumbnail */}
              <div className="flex flex-col items-center">
                <div
                  className="h-48 w-36 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center p-2 dark:border-gray-800 dark:bg-gray-950 overflow-hidden transition-transform duration-300"
                  style={{ transform: `rotate(${rotationAngle}deg)` }}
                >
                  {previewThumb && (
                    <img src={previewThumb} alt="First page preview" className="max-h-full object-contain" />
                  )}
                </div>
                <span className="mt-2 text-xs font-medium text-gray-400">Page 1 Live Orientation</span>
              </div>

              {/* Angle Controls */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Rotation Angle
                  </label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { angle: 90 as const, label: '+90° CW' },
                      { angle: 180 as const, label: '180° Flip' },
                      { angle: 270 as const, label: '270° (90° CCW)' },
                    ].map((opt) => (
                      <button
                        key={opt.angle}
                        type="button"
                        onClick={() => setRotationAngle(opt.angle)}
                        className={`rounded-2xl py-3 text-xs font-bold transition ${
                          rotationAngle === opt.angle
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                            : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Target: {file?.name} ({pageCount} pages will be rotated)
                </p>

                <button
                  disabled={isProcessing}
                  onClick={handleRotate}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>{isProcessing ? 'Rotating...' : 'Rotate & Save PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={resultBytes}
        filename={`${file?.name.replace(/\.[^/.]+$/, '')}_rotated.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
