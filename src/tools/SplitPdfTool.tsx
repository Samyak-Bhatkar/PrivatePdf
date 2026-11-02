import React, { useState } from 'react';
import {
  Scissors,
  CheckCircle2,
  FileArchive,
  Download,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { renderPdfPageToDataUrl, getPdfPageCount } from '../lib/pdfjs';
import { splitPdfByPageIndices, parsePageRanges } from '../utils/pdfEngine';
import { addRecentProject } from '../utils/storage';

export const SplitPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);

  // Split mode: 'range' | 'fixed' | 'visual'
  const [mode, setMode] = useState<'visual' | 'range' | 'fixed'>('visual');
  const [rangeInput, setRangeInput] = useState('1-2');
  const [everyN, setEveryN] = useState(1);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([0]));

  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFileSelected = async (files: File[]) => {
    const target = files[0];
    if (!target) return;

    setFile(target);
    const buf = new Uint8Array(await target.arrayBuffer());
    setBuffer(buf);

    setLoadingThumbs(true);
    try {
      const count = await getPdfPageCount(buf);
      setPageCount(count);

      // Render thumbnail for each page (up to reasonable limits)
      const thumbs: string[] = [];
      const renderLimit = Math.min(count, 40);
      for (let i = 1; i <= renderLimit; i++) {
        const thumb = await renderPdfPageToDataUrl(buf, i, 0.4);
        thumbs.push(thumb);
      }
      setThumbnails(thumbs);
      setSelectedPages(new Set([0]));
      setRangeInput(`1-${Math.min(count, 2)}`);
    } catch (e) {
      console.error('Failed to load PDF for split:', e);
    } finally {
      setLoadingThumbs(false);
    }
  };

  const togglePageSelect = (pageIdx: number) => {
    const next = new Set(selectedPages);
    if (next.has(pageIdx)) next.delete(pageIdx);
    else next.add(pageIdx);
    setSelectedPages(next);
  };

  const handleSelectAll = () => {
    if (selectedPages.size === pageCount) setSelectedPages(new Set());
    else setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  };

  const handleSplit = async () => {
    if (!buffer || pageCount === 0) return;
    setIsProcessing(true);

    try {
      let pageGroups: number[][] = [];

      if (mode === 'visual') {
        const sorted = Array.from(selectedPages).sort((a, b) => a - b);
        if (sorted.length === 0) {
          alert('Please select at least 1 page to extract.');
          setIsProcessing(false);
          return;
        }
        pageGroups = [sorted];
      } else if (mode === 'range') {
        const indices = parsePageRanges(rangeInput, pageCount);
        if (indices.length === 0) {
          alert('Invalid page range entered.');
          setIsProcessing(false);
          return;
        }
        pageGroups = [indices];
      } else if (mode === 'fixed') {
        const n = Math.max(1, everyN);
        for (let i = 0; i < pageCount; i += n) {
          const group: number[] = [];
          for (let j = i; j < Math.min(pageCount, i + n); j++) {
            group.push(j);
          }
          pageGroups.push(group);
        }
      }

      const results = await splitPdfByPageIndices(buffer, pageGroups);

      if (results.length === 1) {
        setPreviewPdfBytes(results[0]);
        setIsPreviewOpen(true);
      } else {
        // Multiple splits -> download ZIP
        const zip = new JSZip();
        results.forEach((bytes, idx) => {
          zip.file(`split_part_${idx + 1}.pdf`, bytes);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file?.name.replace(/\.[^/.]+$/, '')}_split_pages.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      await addRecentProject({
        toolId: 'split-pdf',
        name: `${file?.name.replace(/\.[^/.]+$/, '')}_split.pdf`,
        itemCount: pageGroups.reduce((acc, g) => acc + g.length, 0),
        fileSizeTotal: results.reduce((acc, r) => acc + r.byteLength, 0),
      });
    } catch (err: any) {
      console.error('Failed to split PDF:', err);
      alert('Error splitting PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
              ORGANIZE
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Split PDF
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Extract selected pages, split by page range, or separate every N pages into individual files.
          </p>
        </div>

        {buffer && (
          <button
            disabled={isProcessing}
            onClick={handleSplit}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
          >
            <Scissors className="h-4 w-4" />
            <span>{isProcessing ? 'Splitting...' : 'Extract & Split'}</span>
          </button>
        )}
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF file to split"
          subtitle="Choose the PDF document you want to extract pages from"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main: Page Thumbnails Grid */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {file?.name} ({pageCount} Total Pages)
              </span>

              {mode === 'visual' && (
                <button
                  onClick={handleSelectAll}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  {selectedPages.size === pageCount ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {loadingThumbs ? (
              <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                <Sparkles className="h-5 w-5 animate-spin text-red-600 mr-2" />
                <span>Loading PDF pages locally...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {thumbnails.map((thumb, idx) => {
                  const isSelected = selectedPages.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => mode === 'visual' && togglePageSelect(idx)}
                      className={`relative flex flex-col rounded-2xl border bg-white p-2 shadow-xs transition-all dark:bg-gray-900 ${
                        mode === 'visual' ? 'cursor-pointer hover:scale-[1.02]' : ''
                      } ${
                        isSelected && mode === 'visual'
                          ? 'border-red-500 ring-2 ring-red-500/30'
                          : 'border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-400">
                          {idx + 1}
                        </span>
                        {mode === 'visual' && (
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-full ${
                              isSelected ? 'bg-red-600 text-white' : 'border border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                        )}
                      </div>
                      <div className="aspect-3/4 overflow-hidden rounded bg-gray-50 flex items-center justify-center dark:bg-gray-950">
                        <img src={thumb} alt={`Page ${idx + 1}`} className="max-h-full object-contain" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Split Mode Controls */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-6 h-fit">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-red-600" />
              <span>Split Method</span>
            </h3>

            {/* Mode selection */}
            <div className="space-y-2">
              {[
                { id: 'visual', label: 'Extract Selected Pages', desc: 'Click pages on the grid to extract' },
                { id: 'range', label: 'By Page Range', desc: 'E.g. 1-3, 5, 8-10' },
                { id: 'fixed', label: 'Every N Pages', desc: 'Split into equal chunk files' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id as any)}
                  className={`w-full text-left rounded-2xl p-3 border transition ${
                    mode === m.id
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{m.label}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Inputs based on mode */}
            {mode === 'range' && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Page Ranges (1 to {pageCount})
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 7-9"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
            )}

            {mode === 'fixed' && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Split Every N Pages
                </label>
                <input
                  type="number"
                  min="1"
                  max={pageCount}
                  value={everyN}
                  onChange={(e) => setEveryN(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
            )}

            <button
              disabled={isProcessing}
              onClick={handleSplit}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
            >
              <Scissors className="h-5 w-5" />
              <span>{isProcessing ? 'Processing...' : 'Split & Download'}</span>
            </button>
          </div>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={previewPdfBytes}
        filename={`${file?.name.replace(/\.[^/.]+$/, '')}_extracted.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
