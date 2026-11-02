import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { pdfjsLib } from '../lib/pdfjs';
import { formatBytes } from '../utils/imageEngine';

interface PdfPreviewModalProps {
  pdfBytes: Uint8Array | null;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  pdfBytes,
  filename,
  isOpen,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(false);

  const pdfDocRef = useRef<any>(null);

  // Celebratory confetti once when opening
  useEffect(() => {
    if (isOpen && pdfBytes) {
      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          disableForReducedMotion: true,
          ticks: 100,
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen, pdfBytes]);

  // Load PDF document instance once when pdfBytes or isOpen changes
  useEffect(() => {
    if (!pdfBytes || !isOpen) {
      pdfDocRef.current = null;
      return;
    }

    let isMounted = true;
    setLoading(true);

    (async () => {
      try {
        const copy = new Uint8Array(pdfBytes).slice();
        const loadingTask = pdfjsLib.getDocument({ data: copy });
        const doc = await loadingTask.promise;

        if (!isMounted) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);

        // Render first page
        await renderCurrentPage(doc, 1, scale);
      } catch (err) {
        console.error('Error loading PDF document:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [pdfBytes, isOpen]);

  // Re-render whenever page or scale changes using the loaded document
  const renderCurrentPage = async (doc: any, pageNum: number, currentScale: number) => {
    if (!doc) return;
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: currentScale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await (page.render({
        canvas: canvas as any,
        canvasContext: ctx,
        viewport,
      }) as any).promise;

      setPageImageUrl(canvas.toDataURL('image/jpeg', 0.9));
    } catch (err) {
      console.error('Failed to render page:', err);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (!pdfDocRef.current || newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    setLoading(true);
    await renderCurrentPage(pdfDocRef.current, newPage, scale);
    setLoading(false);
  };

  const handleScaleChange = async (newScale: number) => {
    if (!pdfDocRef.current) return;
    const clamped = Math.max(0.6, Math.min(2.5, newScale));
    setScale(clamped);
    setLoading(true);
    await renderCurrentPage(pdfDocRef.current, currentPage, clamped);
    setLoading(false);
  };

  if (!isOpen || !pdfBytes) return null;

  const handleDownload = () => {
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleShare = async () => {
    if (!navigator.share) {
      handleDownload();
      return;
    }
    try {
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const file = new File([blob], filename.endsWith('.pdf') ? filename : `${filename}.pdf`, {
        type: 'application/pdf',
      });
      await navigator.share({
        title: filename,
        text: 'Generated with PrivatePDF (100% Client-Side)',
        files: [file],
      });
    } catch (err) {
      console.warn('Web Share failed or dismissed:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm"
    >
      <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 sm:px-6 py-3.5 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="preview-modal-title" className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {filename}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {formatBytes(pdfBytes.byteLength)} • {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-red-600/20 hover:bg-red-700 active:scale-95 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                title="Share via WhatsApp, Drive, AirDrop"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Navigation & Zoom */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30 dark:hover:bg-gray-800 transition"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30 dark:hover:bg-gray-800 transition"
              aria-label="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScaleChange(scale - 0.2)}
              className="rounded-lg p-1.5 hover:bg-white dark:hover:bg-gray-800 transition"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="font-semibold text-[11px] px-1">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => handleScaleChange(scale + 0.2)}
              className="rounded-lg p-1.5 hover:bg-white dark:hover:bg-gray-800 transition"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Render Canvas / Preview */}
        <div className="flex flex-1 items-center justify-center bg-gray-200/70 p-4 dark:bg-gray-950 overflow-auto">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              <span>Rendering PDF page...</span>
            </div>
          )}

          {!loading && pageImageUrl && (
            <img
              src={pageImageUrl}
              alt={`Page ${currentPage}`}
              className="max-h-[65vh] max-w-full rounded shadow-xl border border-gray-300 dark:border-gray-800 object-contain bg-white transition-all"
            />
          )}
        </div>
      </div>
    </div>
  );
};
