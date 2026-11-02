import React from 'react';
import { X, FileText } from 'lucide-react';
import type { ImageItem } from '../types';

interface PreviewOrderModalProps {
  isOpen: boolean;
  images: ImageItem[];
  onClose: () => void;
  onSelectPage: (index: number) => void;
}

export const PreviewOrderModal: React.FC<PreviewOrderModalProps> = ({
  isOpen,
  images,
  onClose,
  onSelectPage,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-order-title"
      className="fixed inset-0 z-50 flex flex-col bg-gray-900/80 p-2 sm:p-6 backdrop-blur-md"
    >
      <div className="flex h-full w-full max-w-2xl mx-auto flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
          <div>
            <h2 id="preview-order-title" className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-red-600" />
              <span>Preview Page Order ({images.length} pages)</span>
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Continuous vertical scroll as it will appear in your final PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close order preview"
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable vertical pages stack */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-100/70 dark:bg-gray-950">
          {images.map((item, index) => (
            <div
              key={item.id}
              onClick={() => {
                onClose();
                onSelectPage(index);
              }}
              className="group relative flex flex-col items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800 cursor-pointer hover:border-red-400 hover:ring-2 hover:ring-red-500/20 transition"
            >
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="flex h-6 px-2.5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-xs">
                  Page {index + 1}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-xs">
                  {item.name}
                </span>
              </div>

              <div className="relative max-h-[70vh] flex items-center justify-center overflow-hidden">
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="max-h-[60vh] w-auto object-contain rounded shadow-xs"
                  style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
