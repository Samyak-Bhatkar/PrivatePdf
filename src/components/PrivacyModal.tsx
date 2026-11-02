import React from 'react';
import { ShieldCheck, Lock, WifiOff, EyeOff, Trash2, X, CheckCircle2 } from 'lucide-react';
import { clearAllLocalData } from '../utils/storage';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataCleared?: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose, onDataCleared }) => {
  if (!isOpen) return null;

  const handleClear = async () => {
    if (window.confirm('Clear all local project history and cached data? This cannot be undone.')) {
      await clearAllLocalData();
      if (onDataCleared) onDataCleared();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 id="privacy-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                100% Client-Side Privacy
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your documents never leave your browser or computer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close privacy modal"
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                Unlike traditional online PDF converters, PrivatePDF operates completely inside your web browser. There is no server upload queue, no cloud storage, and no backend API.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-gray-100">
                <Lock className="h-4 w-4 text-red-500" />
                <span>Zero Server Uploads</span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                All conversions, merges, compressions, and edits happen directly in memory via JavaScript.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-gray-100">
                <WifiOff className="h-4 w-4 text-blue-500" />
                <span>Works 100% Offline</span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                You can disconnect your internet or turn on airplane mode; every tool continues to work seamlessly.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-gray-100">
                <EyeOff className="h-4 w-4 text-purple-500" />
                <span>No Tracking or Analytics</span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Zero third-party trackers, telemetry, advertising scripts, or cookies collecting your activity.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-gray-100">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Strict Security Policy</span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Enforced by a Content-Security-Policy header blocking outbound user payload requests.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 rounded-xl border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 transition"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All Local Data</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl bg-gray-900 px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
