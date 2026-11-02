import React from 'react';
import {
  ShieldCheck,
  Lock,
  WifiOff,
  ServerOff,
  Trash2,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { clearAllLocalData } from '../utils/storage';

export const PrivacyPage: React.FC<{
  onBackToHome: () => void;
  onDataCleared?: () => void;
}> = ({ onBackToHome, onDataCleared }) => {
  const handleClear = async () => {
    if (window.confirm('Clear all local project history and browser caches?')) {
      await clearAllLocalData();
      if (onDataCleared) onDataCleared();
      alert('All local data cleared successfully.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <div className="mb-8">
        <button
          onClick={onBackToHome}
          className="text-xs font-bold text-red-600 hover:underline mb-2 inline-block"
        >
          ← Back to All Tools
        </button>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
          Privacy & Security Architecture
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          How PrivatePDF protects your files by running 100% locally in your web browser.
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {/* Core Guarantee */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-emerald-950 dark:text-emerald-200">
                The 100% Local Guarantee
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                When you drag and drop an image or PDF into PrivatePDF, the file is read into your device's memory (RAM) via standard browser HTML5 File APIs. No byte of your files, filenames, or images is ever transmitted across the internet to any cloud server, AI model, or analytics service.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
            How PrivatePDF Compares to Online Converters
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 font-bold">Feature</th>
                  <th className="pb-3 font-bold text-red-600">PrivatePDF</th>
                  <th className="pb-3 font-bold text-gray-400">Standard Web Converters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="py-3 font-medium">Server Uploads</td>
                  <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">ZERO (Client-Side)</td>
                  <td className="py-3 text-red-500">100% Uploaded to Cloud</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Offline Support</td>
                  <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">Full PWA Offline Mode</td>
                  <td className="py-3 text-gray-400">Cannot function offline</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Data Retention</td>
                  <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">Discarded on tab close</td>
                  <td className="py-3 text-gray-400">Stored on remote disks</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Tracking & Ads</td>
                  <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">No trackers or ads</td>
                  <td className="py-3 text-gray-400">Heavy ad networks & cookies</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Processing Speed</td>
                  <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">Instant (No upload latency)</td>
                  <td className="py-3 text-gray-400">Slow upload & download queues</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Technical Architecture */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-2">
              <ServerOff className="h-5 w-5 text-red-600" />
              <span>Zero Backend Infrastructure</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              PrivatePDF has no database, no file upload endpoints, and no cloud compute worker. The application is hosted as static assets that boot entirely in your browser window.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-2">
              <Lock className="h-5 w-5 text-red-600" />
              <span>Enforced Content-Security-Policy</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              We enforce a strict CSP (<code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">connect-src 'self'</code>) that prevents the webpage from making unauthorized network requests containing user payload data.
            </p>
          </div>
        </div>

        {/* Manual wipe section */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">Emergency Data Wipe</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clear all IndexedDB cached project summaries, history, and browser storage in one click.
            </p>
          </div>

          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All Local Storage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
