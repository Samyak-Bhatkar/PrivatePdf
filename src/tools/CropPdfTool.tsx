import React, { useState } from 'react';
import { Crop, Sparkles } from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { getPdfPageCount, renderPdfPageToDataUrl } from '../lib/pdfjs';
import { cropPdfPages } from '../utils/pdfEngine';
import { addRecentProject } from '../utils/storage';

export const CropPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previewThumb, setPreviewThumb] = useState<string | null>(null);

  // Inset percentages (0 to 40%)
  const [cropMargins, setCropMargins] = useState({
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
  });

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
      const thumb = await renderPdfPageToDataUrl(buf, 1, 0.5);
      setPreviewThumb(thumb);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyCrop = async () => {
    if (!buffer || !file) return;
    setIsProcessing(true);

    try {
      const cropped = await cropPdfPages(buffer, cropMargins);
      setResultBytes(cropped);
      setIsPreviewOpen(true);

      await addRecentProject({
        toolId: 'crop-pdf',
        name: `${file.name.replace(/\.[^/.]+$/, '')}_cropped.pdf`,
        itemCount: pageCount,
        fileSizeTotal: cropped.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to crop PDF:', err);
      alert('Error cropping PDF: ' + (err.message || 'Unknown error'));
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
            Crop PDF Pages
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Trim margins and crop PDF page dimensions locally with precision.
        </p>
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF to crop"
          subtitle="Trim whitespace and unwanted margins from your PDF"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            {/* Visual Crop Overlay Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl">
              <div className="relative max-h-72 w-auto shadow-md rounded overflow-hidden">
                {previewThumb && (
                  <img src={previewThumb} alt="Page 1 preview" className="max-h-72 object-contain" />
                )}
                {/* Crop Box Overlay */}
                <div
                  className="absolute border-2 border-dashed border-red-500 bg-red-500/10 pointer-events-none transition-all"
                  style={{
                    top: `${cropMargins.top}%`,
                    bottom: `${cropMargins.bottom}%`,
                    left: `${cropMargins.left}%`,
                    right: `${cropMargins.right}%`,
                  }}
                />
              </div>
              <span className="mt-2 text-xs font-medium text-gray-400">Live Crop Boundary (Page 1)</span>
            </div>

            {/* Margin sliders */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Margin Trim (% from edge)</h3>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <span>Top Margin</span>
                  <span>{cropMargins.top}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={cropMargins.top}
                  onChange={(e) => setCropMargins({ ...cropMargins, top: parseInt(e.target.value) })}
                  className="mt-1 w-full accent-red-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <span>Bottom Margin</span>
                  <span>{cropMargins.bottom}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={cropMargins.bottom}
                  onChange={(e) => setCropMargins({ ...cropMargins, bottom: parseInt(e.target.value) })}
                  className="mt-1 w-full accent-red-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <span>Left Margin</span>
                  <span>{cropMargins.left}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={cropMargins.left}
                  onChange={(e) => setCropMargins({ ...cropMargins, left: parseInt(e.target.value) })}
                  className="mt-1 w-full accent-red-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <span>Right Margin</span>
                  <span>{cropMargins.right}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={cropMargins.right}
                  onChange={(e) => setCropMargins({ ...cropMargins, right: parseInt(e.target.value) })}
                  className="mt-1 w-full accent-red-600 cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <button
                  disabled={isProcessing}
                  onClick={handleApplyCrop}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
                >
                  <Crop className="h-4 w-4" />
                  <span>{isProcessing ? 'Cropping...' : 'Crop & Save PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={resultBytes}
        filename={`${file?.name.replace(/\.[^/.]+$/, '')}_cropped.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
