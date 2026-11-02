import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface MovePositionModalProps {
  isOpen: boolean;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onMoveTo: (targetIndex: number) => void;
}

export const MovePositionModal: React.FC<MovePositionModalProps> = ({
  isOpen,
  currentIndex,
  totalCount,
  onClose,
  onMoveTo,
}) => {
  if (!isOpen) return null;

  const [inputVal, setInputVal] = useState<string>(String(currentIndex + 1));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(inputVal, 10);
    if (isNaN(target) || target < 1 || target > totalCount) {
      setError(`Please enter a valid page number between 1 and ${totalCount}`);
      return;
    }
    onMoveTo(target - 1);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-position-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <h3 id="move-position-title" className="text-sm font-bold text-gray-900 dark:text-white">
            Move Page {currentIndex + 1}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              New position (1 to {totalCount}):
            </label>
            <input
              type="number"
              min={1}
              max={totalCount}
              value={inputVal}
              autoFocus
              onChange={(e) => {
                setInputVal(e.target.value);
                setError(null);
              }}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition"
            >
              <span>Move</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
