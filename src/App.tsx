/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { ToolId } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PrivacyModal } from './components/PrivacyModal';
import { OfflineIndicator } from './components/OfflineIndicator';

import { HomePage } from './pages/HomePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SettingsPage } from './pages/SettingsPage';

// Tools
import { ImageToPdfTool } from './tools/ImageToPdfTool';
import { MergePdfTool } from './tools/MergePdfTool';
import { SplitPdfTool } from './tools/SplitPdfTool';
import { OrganizePdfTool } from './tools/OrganizePdfTool';
import { CompressPdfTool } from './tools/CompressPdfTool';
import { PdfToImagesTool } from './tools/PdfToImagesTool';
import { RotatePdfTool } from './tools/RotatePdfTool';
import { PageNumbersTool } from './tools/PageNumbersTool';
import { WatermarkTool } from './tools/WatermarkTool';
import { CropPdfTool } from './tools/CropPdfTool';
import { SignPdfTool } from './tools/SignPdfTool';
import { ProtectPdfTool } from './tools/ProtectPdfTool';

import { getStoredSettings, clearAllLocalData } from './utils/storage';

export default function App() {
  const [currentTool, setCurrentTool] = useState<ToolId | null>(null);
  const [currentPage, setCurrentPage] = useState<'tools' | 'privacy' | 'settings'>('tools');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Dark mode management
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const settings = getStoredSettings();
    if (settings.darkMode === 'dark') return true;
    if (settings.darkMode === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle auto-clear on unload if configured
  useEffect(() => {
    const handleBeforeUnload = () => {
      const settings = getStoredSettings();
      if (settings.autoClearOnClose) {
        clearAllLocalData();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleThemeModeSelect = (mode: 'system' | 'light' | 'dark') => {
    if (mode === 'dark') setIsDarkMode(true);
    else if (mode === 'light') setIsDarkMode(false);
    else setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  };

  const handleSelectTool = (id: ToolId | null) => {
    setCurrentTool(id);
    setCurrentPage('tools');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderToolContent = () => {
    if (currentPage === 'privacy') {
      return (
        <PrivacyPage
          onBackToHome={() => {
            setCurrentPage('tools');
            setCurrentTool(null);
          }}
        />
      );
    }

    if (currentPage === 'settings') {
      return (
        <SettingsPage
          onBackToHome={() => {
            setCurrentPage('tools');
            setCurrentTool(null);
          }}
          onThemeChanged={handleThemeModeSelect}
        />
      );
    }

    switch (currentTool) {
      case 'image-to-pdf':
        return <ImageToPdfTool />;
      case 'merge-pdf':
        return <MergePdfTool />;
      case 'split-pdf':
        return <SplitPdfTool />;
      case 'organize-pdf':
        return <OrganizePdfTool />;
      case 'compress-pdf':
        return <CompressPdfTool />;
      case 'pdf-to-images':
        return <PdfToImagesTool />;
      case 'rotate-pdf':
        return <RotatePdfTool />;
      case 'page-numbers':
        return <PageNumbersTool />;
      case 'watermark':
        return <WatermarkTool />;
      case 'crop-pdf':
        return <CropPdfTool />;
      case 'sign-pdf':
        return <SignPdfTool />;
      case 'protect-pdf':
        return <ProtectPdfTool />;
      default:
        return (
          <HomePage
            onSelectTool={handleSelectTool}
            onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-950 dark:text-gray-100">
      <Navbar
        currentTool={currentPage === 'tools' ? currentTool : null}
        onSelectTool={handleSelectTool}
        onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
        onOpenSettings={() => {
          setCurrentPage('settings');
          setCurrentTool(null);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <main className="flex-1 pb-16">
        {renderToolContent()}
      </main>

      <Footer
        onSelectTool={handleSelectTool}
        onOpenPrivacy={() => {
          setCurrentPage('privacy');
          setCurrentTool(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <OfflineIndicator />

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
