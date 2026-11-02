import React, { useState, useEffect } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Trash2,
  Shield,
  Save,
  Check,
} from 'lucide-react';
import type { PageSizeOption, ImageQualityOption } from '../types';
import {
  getStoredSettings,
  saveStoredSettings,
  clearAllLocalData,
  AppSettings,
} from '../utils/storage';

export const SettingsPage: React.FC<{
  onBackToHome: () => void;
  onThemeChanged: (mode: 'system' | 'light' | 'dark') => void;
  onDataCleared?: () => void;
}> = ({ onBackToHome, onThemeChanged, onDataCleared }) => {
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());
  const [savedToast, setSavedToast] = useState(false);

  const handleUpdate = (patch: Partial<AppSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    saveStoredSettings(updated);

    if (patch.darkMode) {
      onThemeChanged(patch.darkMode);
    }

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleClearData = async () => {
    if (window.confirm('Wipe all local settings, IndexedDB projects, and history?')) {
      await clearAllLocalData();
      if (onDataCleared) onDataCleared();
      alert('All local storage has been wiped.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button
            onClick={onBackToHome}
            className="text-xs font-bold text-red-600 hover:underline mb-2 inline-block"
          >
            ← Back to All Tools
          </button>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-7 w-7 text-red-600" />
            <span>Preferences & Privacy Settings</span>
          </h1>
        </div>

        {savedToast && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Appearance Mode */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Appearance & Theme
          </label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { id: 'system', label: 'System Default', icon: <Monitor className="h-4 w-4" /> },
              { id: 'light', label: 'Light Mode', icon: <Sun className="h-4 w-4" /> },
              { id: 'dark', label: 'Dark Mode', icon: <Moon className="h-4 w-4" /> },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => handleUpdate({ darkMode: th.id as any })}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold transition ${
                  settings.darkMode === th.id
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {th.icon}
                <span>{th.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Default Tool Defaults */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Default Converter Options
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Default Page Size
              </label>
              <select
                value={settings.defaultPageSize}
                onChange={(e) => handleUpdate({ defaultPageSize: e.target.value as PageSizeOption })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="A4">A4 (Standard International)</option>
                <option value="Letter">US Letter (8.5 × 11 in)</option>
                <option value="Legal">US Legal</option>
                <option value="Fit">Fit to Image Size</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Default Image Compression Quality
              </label>
              <select
                value={settings.defaultQuality}
                onChange={(e) => handleUpdate({ defaultQuality: e.target.value as ImageQualityOption })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="high">High Quality (~88% - Recommended)</option>
                <option value="original">Original / Maximum (No loss)</option>
                <option value="medium">Medium (~70% - Smaller size)</option>
                <option value="low">Low (~50% - Minimal size)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy & Storage Preferences */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Local Data Hygiene
          </label>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                Auto-clear history on tab close
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Automatically flush local IndexedDB project records when closing the tab.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoClearOnClose}
              onChange={(e) => handleUpdate({ autoClearOnClose: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-red-600">Wipe Everything</p>
              <p className="text-[11px] text-gray-400">Clear all preferences and local caches.</p>
            </div>
            <button
              onClick={handleClearData}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Wipe Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
