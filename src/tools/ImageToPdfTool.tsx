import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  FilePlus,
  Settings2,
  Trash2,
  RotateCw,
  RotateCcw,
  Undo2,
  Redo2,
  Sparkles,
  CheckSquare,
  Square,
  Sliders,
  LayoutGrid,
  Check,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import JSZip from 'jszip';
import type { ImageItem, ImageToPdfSettings, PageSizeOption, PageOrientation, ImageFitOption, ImageQualityOption, MarginOption } from '../types';
import { isSupportedImage, formatBytes, convertImagesToPdf } from '../utils/imageEngine';
import { FileDropzone } from '../components/FileDropzone';
import { SortableImageCard } from '../components/SortableImageCard';
import { ImageEditModal } from '../components/ImageEditModal';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { FullscreenPageViewer } from '../components/FullscreenPageViewer';
import { MovePositionModal } from '../components/MovePositionModal';
import { PreviewOrderModal } from '../components/PreviewOrderModal';
import { addRecentProject } from '../utils/storage';

const ARRANGE_MODE_STORAGE_KEY = 'privatepdf_arrange_mode';
const DENSITY_STORAGE_KEY = 'privatepdf_grid_density';

export const ImageToPdfTool: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [history, setHistory] = useState<ImageItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Editing & Preview Modal States
  const [editingItem, setEditingItem] = useState<ImageItem | null>(null);
  const [zoomItem, setZoomItem] = useState<ImageItem | null>(null);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Conversion Progress State
  const [isConverting, setIsConverting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Settings
  const [settings, setSettings] = useState<ImageToPdfSettings>({
    pageSize: 'A4',
    orientation: 'portrait',
    margin: 'small',
    customMarginPt: 18,
    fit: 'fit',
    quality: 'high',
    bgColor: '#ffffff',
    pageNumbers: 'bottom-center',
    headerText: '',
    footerText: '',
    mergeAll: true,
    filename: 'converted_document',
  });

  const [showSettingsDrawer, setShowSettingsDrawer] = useState(true);

  // --------------------------------------------------------------------------
  // NEW ARRANGE MODE & DENSITY STATES (Persisted in localStorage)
  // --------------------------------------------------------------------------
  const [isArrangeMode, setIsArrangeMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ARRANGE_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [density, setDensity] = useState<1 | 2 | 3>(() => {
    try {
      const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
      if (stored === '1' || stored === '2' || stored === '3') {
        return parseInt(stored, 10) as 1 | 2 | 3;
      }
    } catch {
      // fallback
    }
    return 2; // Default on phones
  });

  // Fullscreen page viewer & move modal & preview order modal states
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [moveModalIndex, setMoveModalIndex] = useState<number | null>(null);
  const [isPreviewOrderOpen, setIsPreviewOrderOpen] = useState(false);

  // High-res worker thumbnails mapping
  const [highResThumbs, setHighResThumbs] = useState<Record<string, string>>({});
  const workerRef = useRef<Worker | null>(null);

  // Active drag item for DragOverlay
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Save arrange mode & density changes to localStorage
  const handleToggleArrangeMode = (val: boolean) => {
    setIsArrangeMode(val);
    try {
      localStorage.setItem(ARRANGE_MODE_STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
  };

  const handleSetDensity = (val: 1 | 2 | 3) => {
    setDensity(val);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
  };

  // Initialize Web Worker for background 800px thumbnail generation
  useEffect(() => {
    try {
      const worker = new Worker(
        new URL('../workers/thumbnailWorker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { id, success, blob } = e.data;
        if (success && blob) {
          const url = URL.createObjectURL(blob);
          setHighResThumbs((prev) => ({ ...prev, [id]: url }));
        }
      };

      return () => {
        worker.terminate();
      };
    } catch (err) {
      console.warn('Offscreen thumbnail worker not supported in this context:', err);
    }
  }, []);

  // Request worker generation for new images
  useEffect(() => {
    if (!workerRef.current || typeof createImageBitmap === 'undefined') return;

    images.forEach((img) => {
      if (!highResThumbs[img.id] && img.file) {
        createImageBitmap(img.file)
          .then((bitmap) => {
            workerRef.current?.postMessage({ id: img.id, bitmap, maxEdge: 800 }, [bitmap]);
          })
          .catch(() => {
            // fallback gracefully to standard previewUrl
          });
      }
    });
  }, [images, highResThumbs]);

  // Touch sensors with 250ms long-press delay and haptics for touch devices
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Pinch-to-zoom on grid container to change density smoothly
  const gridTouchDistance = useRef<number | null>(null);

  const handleGridTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      gridTouchDistance.current = Math.hypot(dx, dy);
    }
  };

  const handleGridTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && gridTouchDistance.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const diff = currentDist - gridTouchDistance.current;

      // Pinch out (fingers apart) = fewer, bigger columns
      if (diff > 75) {
        if (density === 3) handleSetDensity(2);
        else if (density === 2) handleSetDensity(1);
        gridTouchDistance.current = currentDist;
      }
      // Pinch in (fingers together) = more, smaller columns
      else if (diff < -75) {
        if (density === 1) handleSetDensity(2);
        else if (density === 2) handleSetDensity(3);
        gridTouchDistance.current = currentDist;
      }
    }
  };

  const handleGridTouchEnd = () => {
    gridTouchDistance.current = null;
  };

  // Helper to commit state with undo history
  const updateImagesWithHistory = (newImages: ImageItem[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newImages);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setImages(newImages);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setImages(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setImages(next);
    }
  };

  // Add Files
  const handleFilesSelected = (files: File[]) => {
    const validFiles = files.filter(isSupportedImage);
    if (validFiles.length === 0) return;

    const newItems: ImageItem[] = validFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        width: 1200,
        height: 1600,
        rotation: 0,
      };
    });

    newItems.forEach((item) => {
      const img = new Image();
      img.onload = () => {
        item.width = img.naturalWidth;
        item.height = img.naturalHeight;
      };
      img.src = item.previewUrl;
    });

    const combined = [...images, ...newItems];
    updateImagesWithHistory(combined);
  };

  // Drag start with haptic feedback
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
  };

  // Drag-and-drop reorder
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((i) => i.id === active.id);
      const newIndex = images.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(images, oldIndex, newIndex);
      updateImagesWithHistory(reordered);
    }
  };

  // Rotate single image
  const handleRotate = (id: string, degreesDelta: number) => {
    const updated = images.map((img) => {
      if (img.id === id) {
        return {
          ...img,
          rotation: ((img.rotation || 0) + degreesDelta + 360) % 360,
        };
      }
      return img;
    });
    updateImagesWithHistory(updated);
  };

  // Delete single image
  const handleDelete = (id: string) => {
    const target = images.find((i) => i.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    const updated = images.filter((i) => i.id !== id);
    updateImagesWithHistory(updated);
    selectedIds.delete(id);
    setSelectedIds(new Set(selectedIds));
  };

  // Duplicate image
  const handleDuplicate = (id: string) => {
    const targetIndex = images.findIndex((i) => i.id === id);
    if (targetIndex === -1) return;
    const item = images[targetIndex];
    const dup: ImageItem = {
      ...item,
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${item.name.replace(/\.[^/.]+$/, '')}_copy.${item.name.split('.').pop()}`,
    };
    const nextImages = [...images];
    nextImages.splice(targetIndex + 1, 0, dup);
    updateImagesWithHistory(nextImages);
  };

  // Fast reorder helpers (Move to first / last / specific position / earlier / later)
  const handleMoveToFirst = (id: string) => {
    const oldIndex = images.findIndex((i) => i.id === id);
    if (oldIndex > 0) {
      const reordered = arrayMove(images, oldIndex, 0);
      updateImagesWithHistory(reordered);
    }
  };

  const handleMoveToLast = (id: string) => {
    const oldIndex = images.findIndex((i) => i.id === id);
    if (oldIndex !== -1 && oldIndex < images.length - 1) {
      const reordered = arrayMove(images, oldIndex, images.length - 1);
      updateImagesWithHistory(reordered);
    }
  };

  const handleMoveToIndex = (fromIndex: number, targetIndex: number) => {
    if (
      fromIndex >= 0 &&
      fromIndex < images.length &&
      targetIndex >= 0 &&
      targetIndex < images.length &&
      fromIndex !== targetIndex
    ) {
      const reordered = arrayMove(images, fromIndex, targetIndex);
      updateImagesWithHistory(reordered);
      if (viewerIndex !== null && viewerIndex === fromIndex) {
        setViewerIndex(targetIndex);
      }
    }
  };

  const handleMoveEarlier = (index: number) => {
    if (index > 0) {
      handleMoveToIndex(index, index - 1);
    }
  };

  const handleMoveLater = (index: number) => {
    if (index < images.length - 1) {
      handleMoveToIndex(index, index + 1);
    }
  };

  // Sort helpers
  const handleSort = (type: 'name' | 'size' | 'reverse') => {
    const copy = [...images];
    if (type === 'name') {
      copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    } else if (type === 'size') {
      copy.sort((a, b) => b.size - a.size);
    } else if (type === 'reverse') {
      copy.reverse();
    }
    updateImagesWithHistory(copy);
  };

  // Multi-select bulk actions
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((i) => i.id)));
    }
  };

  const handleBulkRotate = (delta: number) => {
    if (selectedIds.size === 0) return;
    const updated = images.map((img) => {
      if (selectedIds.has(img.id)) {
        return {
          ...img,
          rotation: ((img.rotation || 0) + delta + 360) % 360,
        };
      }
      return img;
    });
    updateImagesWithHistory(updated);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const remaining = images.filter((img) => !selectedIds.has(img.id));
    updateImagesWithHistory(remaining);
    setSelectedIds(new Set());
  };

  // Save edited image
  const handleSaveEditedImage = (updatedItem: ImageItem) => {
    const updated = images.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    updateImagesWithHistory(updated);
  };

  // Estimated file size calculation
  const totalInputBytes = images.reduce((acc, curr) => acc + curr.size, 0);
  const estimatedOutputBytes = Math.round(
    totalInputBytes *
      (settings.quality === 'original'
        ? 1.05
        : settings.quality === 'high'
        ? 0.75
        : settings.quality === 'medium'
        ? 0.45
        : 0.25)
  );

  // Convert Action
  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsConverting(true);
    setProgressPct(5);
    setProgressStatus('Initializing local PDF engine...');

    try {
      if (settings.mergeAll) {
        const pdfBytes = await convertImagesToPdf(images, settings, (pct, curr, total) => {
          setProgressPct(pct);
          setProgressStatus(`Encoding page ${curr} of ${total}...`);
        });

        setGeneratedPdfBytes(pdfBytes);
        setIsPreviewOpen(true);

        await addRecentProject({
          toolId: 'image-to-pdf',
          name: `${settings.filename}.pdf`,
          itemCount: images.length,
          fileSizeTotal: pdfBytes.byteLength,
        });
      } else {
        setProgressStatus('Creating ZIP archive...');
        const zip = new JSZip();

        for (let i = 0; i < images.length; i++) {
          setProgressPct(Math.round(((i + 1) / images.length) * 90));
          setProgressStatus(`Generating PDF ${i + 1} of ${images.length}...`);

          const singlePdfBytes = await convertImagesToPdf([images[i]], settings);
          const cleanName = images[i].name.replace(/\.[^/.]+$/, '');
          zip.file(`${cleanName}.pdf`, singlePdfBytes);
        }

        setProgressStatus('Compressing ZIP...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${settings.filename}_individual_pdfs.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        await addRecentProject({
          toolId: 'image-to-pdf',
          name: `${settings.filename}_individual_pdfs.zip`,
          itemCount: images.length,
          fileSizeTotal: zipBlob.size,
        });
      }
    } catch (err: any) {
      console.error('Failed to convert images to PDF:', err);
      alert('Error creating PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConverting(false);
      setProgressPct(0);
    }
  };

  // Grid column classes based on mode and density
  const getGridClasses = () => {
    if (!isArrangeMode) {
      return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4';
    }
    if (density === 1) {
      return 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto';
    }
    if (density === 2) {
      return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4';
    }
    return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3';
  };

  const activeDragItem = activeDragId ? images.find((i) => i.id === activeDragId) : null;
  const activeDragIndex = activeDragId ? images.findIndex((i) => i.id === activeDragId) : -1;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. ARRANGE MODE STICKY SLIM TOP BAR (shown when Arrange mode is ON) */}
      {/* ------------------------------------------------------------------ */}
      {isArrangeMode && images.length > 0 && (
        <div className="sticky top-16 z-30 mb-4 flex items-center justify-between rounded-2xl border border-gray-200/90 bg-white/95 p-2.5 shadow-md backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95 transition-all">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleArrangeMode(false)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              aria-label="Exit Arrange Mode"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline">Back</span>
            </button>

            <span className="text-xs font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4 text-red-600" />
              <span>Arrange ({images.length})</span>
            </span>
          </div>

          {/* Density 1 / 2 / 3 switch */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => handleSetDensity(1)}
              title="1 column (Large detail)"
              aria-label="1 column layout"
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                density === 1
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              1
            </button>
            <button
              onClick={() => handleSetDensity(2)}
              title="2 columns (Default phone)"
              aria-label="2 columns layout"
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                density === 2
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              2
            </button>
            <button
              onClick={() => handleSetDensity(3)}
              title="3 columns (Overview)"
              aria-label="3 columns layout"
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                density === 3
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              3
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Undo / Redo */}
            <button
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Undo"
              aria-label="Undo reorder"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Redo"
              aria-label="Redo reorder"
            >
              <Redo2 className="h-4 w-4" />
            </button>

            {/* Preview Order Button */}
            <button
              onClick={() => setIsPreviewOrderOpen(true)}
              title="Preview vertical page order"
              aria-label="Preview continuous vertical page order"
              className="hidden sm:flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <Eye className="h-3.5 w-3.5 text-red-500" />
              <span>Preview</span>
            </button>

            {/* Done Button */}
            <button
              onClick={() => handleToggleArrangeMode(false)}
              className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition"
              aria-label="Done arranging pages"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. REGULAR TOOL HEADER (Hidden when Arrange mode is active)         */}
      {/* ------------------------------------------------------------------ */}
      {!isArrangeMode && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
                CONVERT
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                Image to PDF
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Convert JPG, PNG, WEBP, GIF, and BMP into clean, beautifully formatted PDFs.
            </p>
          </div>

          {images.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Arrange Mode Toggle Button */}
              <button
                onClick={() => handleToggleArrangeMode(true)}
                className="flex items-center gap-1.5 rounded-xl border-2 border-red-500 bg-red-50/70 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-600 transition active:scale-95 shadow-xs"
                title="Open fullscreen Arrange Mode to reorder pages easily on mobile"
                aria-label="Open Arrange Mode"
              >
                <LayoutGrid className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span>Arrange</span>
              </button>

              {/* Preview Order Button */}
              <button
                onClick={() => setIsPreviewOrderOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                title="Preview continuous vertical page order"
                aria-label="Preview page order"
              >
                <Eye className="h-4 w-4 text-red-500" />
                <span className="hidden xs:inline">Order Check</span>
              </button>

              <button
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden xs:inline">{showSettingsDrawer ? 'Hide Settings' : 'PDF Settings'}</span>
              </button>

              <button
                disabled={isConverting}
                onClick={handleConvert}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
              >
                <Sparkles className="h-4 w-4" />
                <span>{settings.mergeAll ? 'Convert to PDF' : 'Download ZIP'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. MAIN WORKSPACE AREA                                             */}
      {/* ------------------------------------------------------------------ */}
      {images.length === 0 ? (
        <div className="py-6">
          <FileDropzone
            accept="image/*"
            multiple={true}
            supportCamera={true}
            onFilesSelected={handleFilesSelected}
            title="Drop your images here"
            subtitle="JPG, PNG, WEBP, GIF, BMP, or capture directly with camera"
          />
        </div>
      ) : (
        <div className={!isArrangeMode && showSettingsDrawer ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : 'w-full'}>
          {/* Main Grid Column */}
          <div className={!isArrangeMode && showSettingsDrawer ? 'lg:col-span-3' : 'w-full'}>
            {/* Standard Toolbar (Only when Arrange mode is OFF) */}
            {!isArrangeMode && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                {/* Left: Multi-select & Bulk tools + Arrange quick button */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    title="Select All"
                  >
                    {selectedIds.size === images.length ? (
                      <CheckSquare className="h-4 w-4 text-red-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select All'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleToggleArrangeMode(true)}
                    className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                    title="Switch to full-tile Arrange Mode"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Arrange</span>
                  </button>

                  {selectedIds.size > 0 && (
                    <>
                      <button
                        onClick={() => handleBulkRotate(90)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        title="Rotate selected"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>Rotate</span>
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Delete selected"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Right: Undo/Redo & Sort & Add More */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={historyIndex <= 0}
                    onClick={handleUndo}
                    className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                    title="Undo"
                    aria-label="Undo action"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                  <button
                    disabled={historyIndex >= history.length - 1}
                    onClick={handleRedo}
                    className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
                    title="Redo"
                    aria-label="Redo action"
                  >
                    <Redo2 className="h-4 w-4" />
                  </button>

                  <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1" />

                  <button
                    onClick={() => handleSort('name')}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    title="Sort by file name"
                  >
                    By Name
                  </button>
                  <button
                    onClick={() => handleSort('reverse')}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    title="Reverse order"
                  >
                    Reverse
                  </button>

                  <label className="ml-2 flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 cursor-pointer dark:bg-gray-800 dark:text-gray-200">
                    <FilePlus className="h-3.5 w-3.5" />
                    <span>Add More</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Pinchable Sortable Grid */}
            <div
              onTouchStart={isArrangeMode ? handleGridTouchStart : undefined}
              onTouchMove={isArrangeMode ? handleGridTouchMove : undefined}
              onTouchEnd={isArrangeMode ? handleGridTouchEnd : undefined}
              className="touch-pan-y"
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 10 }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
                  <div className={getGridClasses()}>
                    {images.map((item, index) => (
                      <SortableImageCard
                        key={item.id}
                        item={item}
                        index={index}
                        isSelected={selectedIds.has(item.id)}
                        isArrangeMode={isArrangeMode}
                        density={density}
                        highResThumbUrl={highResThumbs[item.id]}
                        hasSelectionActive={selectedIds.size > 0}
                        onToggleSelect={handleToggleSelect}
                        onRotate={handleRotate}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                        onEdit={(it) => setEditingItem(it)}
                        onZoom={(it) => setZoomItem(it)}
                        onOpenViewer={(idx) => setViewerIndex(idx)}
                        onMoveToPosition={(idx) => setMoveModalIndex(idx)}
                        onMoveToFirst={handleMoveToFirst}
                        onMoveToLast={handleMoveToLast}
                      />
                    ))}
                  </div>
                </SortableContext>

                {/* Drag Overlay with enlarged shadow for touch feedback */}
                <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                  {activeDragItem ? (
                    <div className="scale-105 opacity-90 shadow-2xl rounded-2xl border-2 border-red-500 overflow-hidden bg-white dark:bg-gray-900 pointer-events-none">
                      <div className="relative aspect-3/4 w-36 sm:w-48 flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-950">
                        <img
                          src={highResThumbs[activeDragItem.id] || activeDragItem.previewUrl}
                          alt="Dragging"
                          className="max-h-full max-w-full object-contain rounded"
                          style={{ transform: `rotate(${activeDragItem.rotation || 0}deg)` }}
                        />
                        <span className="absolute top-2 left-2 rounded-full bg-red-600 text-white font-bold text-xs px-2 py-0.5">
                          {activeDragIndex + 1}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>

          {/* Settings Drawer / Panel (Only visible when Arrange mode is OFF and showSettingsDrawer is true) */}
          {!isArrangeMode && showSettingsDrawer && (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-6 h-fit">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-red-600" />
                  <span>PDF Settings</span>
                </h3>
                <span className="text-xs text-gray-400">
                  {images.length} {images.length === 1 ? 'image' : 'images'}
                </span>
              </div>

              {/* Page Size */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Page Size
                </label>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(['A4', 'Letter', 'Fit', 'Legal', 'A3', 'A5'] as PageSizeOption[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSettings({ ...settings, pageSize: sz })}
                      className={`rounded-xl py-2 text-xs font-semibold transition ${
                        settings.pageSize === sz
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'border border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              {settings.pageSize !== 'Fit' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Orientation
                  </label>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(['portrait', 'landscape', 'auto'] as PageOrientation[]).map((or) => (
                      <button
                        key={or}
                        type="button"
                        onClick={() => setSettings({ ...settings, orientation: or })}
                        className={`rounded-xl py-2 text-xs font-semibold capitalize transition ${
                          settings.orientation === or
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'border border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {or}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Margins */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Margin
                </label>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(['none', 'small', 'big'] as MarginOption[]).map((mg) => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => setSettings({ ...settings, margin: mg })}
                      className={`rounded-xl py-2 text-xs font-semibold capitalize transition ${
                        settings.margin === mg
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'border border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                    >
                      {mg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Fit */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Image Fit
                </label>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {(['fit', 'fill', 'stretch', 'center'] as ImageFitOption[]).map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setSettings({ ...settings, fit: ft })}
                      className={`rounded-xl py-2 text-xs font-semibold capitalize transition ${
                        settings.fit === ft
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                          : 'border border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality & Live Size Estimate */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Image Quality
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Est: ~{formatBytes(estimatedOutputBytes)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {(['original', 'high', 'medium', 'low'] as ImageQualityOption[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSettings({ ...settings, quality: q })}
                      className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
                        settings.quality === q
                          ? 'bg-red-600 text-white'
                          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Numbers */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Page Numbers
                </label>
                <select
                  value={settings.pageNumbers}
                  onChange={(e) => setSettings({ ...settings, pageNumbers: e.target.value as any })}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="none">None</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="top-center">Top Center</option>
                </select>
              </div>

              {/* Custom Filename */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  File Name
                </label>
                <input
                  type="text"
                  value={settings.filename}
                  onChange={(e) => setSettings({ ...settings, filename: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="converted_document"
                />
              </div>

              {/* Output Mode: Single PDF vs ZIP */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!settings.mergeAll}
                    onChange={(e) => setSettings({ ...settings, mergeAll: !e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Separate PDF per image (ZIP bundle)
                  </span>
                </label>
              </div>

              {/* Primary Convert Button */}
              <button
                disabled={isConverting}
                onClick={handleConvert}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
              >
                <Sparkles className="h-5 w-5" />
                <span>{settings.mergeAll ? 'Convert to PDF' : 'Download ZIP'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conversion Progress Modal */}
      {isConverting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40">
              <Sparkles className="h-7 w-7 animate-spin" />
            </div>
            <h3 className="mt-4 font-bold text-gray-900 dark:text-white">Processing Document</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{progressStatus}</p>

            <div className="mt-5 w-full bg-gray-100 rounded-full h-2.5 dark:bg-gray-800 overflow-hidden">
              <div
                className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-right text-[11px] font-bold text-red-600">{progressPct}%</p>
          </div>
        </div>
      )}

      {/* Edit Image Modal */}
      <ImageEditModal
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditedImage}
      />

      {/* PDF Live Preview Modal */}
      <PdfPreviewModal
        pdfBytes={generatedPdfBytes}
        filename={`${settings.filename}.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Zoom Image Modal */}
      {zoomItem && (
        <div
          onClick={() => setZoomItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
        >
          <img
            src={highResThumbs[zoomItem.id] || zoomItem.previewUrl}
            alt={zoomItem.name}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            style={{ transform: `rotate(${zoomItem.rotation || 0}deg)` }}
          />
        </div>
      )}

      {/* 4. Fullscreen Page Viewer */}
      {viewerIndex !== null && (
        <FullscreenPageViewer
          isOpen={viewerIndex !== null}
          images={images}
          currentIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNavigate={(newIdx) => setViewerIndex(newIdx)}
          onRotate={handleRotate}
          onDelete={handleDelete}
          onEdit={(it) => setEditingItem(it)}
          onMoveEarlier={handleMoveEarlier}
          onMoveLater={handleMoveLater}
          onOpenMoveTo={(idx) => setMoveModalIndex(idx)}
        />
      )}

      {/* 5. Move to Position Modal */}
      {moveModalIndex !== null && (
        <MovePositionModal
          isOpen={moveModalIndex !== null}
          currentIndex={moveModalIndex}
          totalCount={images.length}
          onClose={() => setMoveModalIndex(null)}
          onMoveTo={(targetIdx) => handleMoveToIndex(moveModalIndex, targetIdx)}
        />
      )}

      {/* 6. Preview Order Continuous Vertical Scroll Modal */}
      <PreviewOrderModal
        isOpen={isPreviewOrderOpen}
        images={images}
        onClose={() => setIsPreviewOrderOpen(false)}
        onSelectPage={(idx) => {
          if (isArrangeMode) setViewerIndex(idx);
        }}
      />
    </div>
  );
};
