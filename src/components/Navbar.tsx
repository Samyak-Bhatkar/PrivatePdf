import React from 'react';
import { FileText, ShieldCheck, Moon, Sun, Settings, ArrowLeft } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import type { ToolId } from '../types';

interface NavbarProps {
  currentTool: ToolId | null;
  onSelectTool: (toolId: ToolId | null) => void;
  onOpenPrivacy: () => void;
  onOpenSettings: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTool,
  onSelectTool,
  onOpenPrivacy,
  onOpenSettings,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md dark:border-gray-800/80 dark:bg-gray-950/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Back button */}
        <div className="flex items-center gap-3">
          {currentTool ? (
            <button
              onClick={() => onSelectTool(null)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-gray-800 transition"
              aria-label="Back to all tools"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>All Tools</span>
            </button>
          ) : (
            <button
              onClick={() => onSelectTool(null)}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              aria-label="PrivatePDF Home"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
                  Private<span className="text-red-600">PDF</span>
                </span>
                <span className="hidden sm:inline-block ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
                  LOCAL ONLY
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Center: Privacy Badge */}
        <div className="hidden md:flex items-center">
          <button
            onClick={onOpenPrivacy}
            className="flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 transition shadow-xs"
            title="Click for details on client-side security"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>100% private — files never leave this device</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenPrivacy}
            className="flex md:hidden items-center justify-center rounded-xl p-2 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            aria-label="Privacy information"
          >
            <ShieldCheck className="h-5 w-5" />
          </button>

          <PWAInstallButton />

          <button
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Open Settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
