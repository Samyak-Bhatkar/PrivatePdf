import React, { useState } from 'react';
import { Hash, Sparkles } from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { getPdfPageCount } from '../lib/pdfjs';
import { addPageNumbersToPdf } from '../utils/pdfEngine';
import { addRecentProject } from '../utils/storage';

export const PageNumbersTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const [format, setFormat] = useState<'n' | 'n_of_total' | 'page_n' | 'page_n_of_total'>('page_n_of_total');
  const [position, setPosition] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'
  >('bottom-center');
  const [fontSize, setFontSize] = useState(10);
  const [colorHex, setColorHex] = useState('#555555');

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
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async () => {
    if (!buffer || !file) return;
    setIsProcessing(true);

    try {
      const stamped = await addPageNumbersToPdf(buffer, {
        format,
        position,
        fontSize,
        colorHex,
      });
      setResultBytes(stamped);
      setIsPreviewOpen(true);

      await addRecentProject({
        toolId: 'page-numbers',
        name: `${file.name.replace(/\.[^/.]+$/, '')}_numbered.pdf`,
        itemCount: pageCount,
        fileSizeTotal: stamped.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to add page numbers:', err);
      alert('Error adding page numbers: ' + (err.message || 'Unknown error'));
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
            Add Page Numbers
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Insert customizable page numbers, counts, and formats directly into your PDF document.
        </p>
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF to add page numbers"
          subtitle="Choose any PDF document to stamp page numbers"
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Format */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Numbering Format
                </label>
                <div className="mt-2 space-y-2">
                  {[
                    { id: 'page_n_of_total', label: 'Page 1 of 12' },
                    { id: 'n_of_total', label: '1 / 12' },
                    { id: 'page_n', label: 'Page 1' },
                    { id: 'n', label: '1' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id as any)}
                      className={`w-full text-left rounded-xl px-3.5 py-2.5 text-xs font-semibold border transition ${
                        format === fmt.id
                          ? 'border-red-500 bg-red-50/50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Position
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { id: 'top-left', label: 'Top Left' },
                    { id: 'top-center', label: 'Top Center' },
                    { id: 'top-right', label: 'Top Right' },
                    { id: 'bottom-left', label: 'Bottom Left' },
                    { id: 'bottom-center', label: 'Bottom Center' },
                    { id: 'bottom-right', label: 'Bottom Right' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setPosition(pos.id as any)}
                      className={`rounded-xl py-2.5 text-[11px] font-semibold transition ${
                        position === pos.id
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                {/* Font Size & Color */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Size: {fontSize}pt</label>
                    <input
                      type="range"
                      min="8"
                      max="18"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="mt-1 w-full accent-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Color</label>
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="mt-1 h-8 w-full rounded border border-gray-200 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={isProcessing}
              onClick={handleApply}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
            >
              <Sparkles className="h-5 w-5" />
              <span>{isProcessing ? 'Adding numbers...' : 'Add Page Numbers & Preview'}</span>
            </button>
          </div>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={resultBytes}
        filename={`${file?.name.replace(/\.[^/.]+$/, '')}_numbered.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
