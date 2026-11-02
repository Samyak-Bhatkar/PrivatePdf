import React, { useState, useRef, useTransition } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
  ArrowUpDown,
  Sparkles,
  Download,
  Share2,
  Eye,
  Sliders,
  CheckSquare,
  Square,
  Archive,
  ChevronDown,
  Layers,
} from 'lucide-react';
import JSZip from 'jszip';
import type { ImageItem, ImageToPdfSettings, PageSizeOption, PageOrientation, ImageFitOption, ImageQualityOption, MarginOption } from '../types';
import { isSupportedImage, formatBytes, convertImagesToPdf, processImageCanvas } from '../utils/imageEngine';
import { FileDropzone } from '../components/FileDropzone';
import { SortableImageCard } from '../components/SortableImageCard';
import { ImageEditModal } from '../components/ImageEditModal';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { addRecentProject } from '../utils/storage';

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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        width: 1200, // placeholder updated asynchronously
        height: 1600,
        rotation: 0,
      };
    });

    // Asynchronously resolve natural width and height
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

  // Drag-and-drop reorder
  const handleDragEnd = (event: DragEndEvent) => {
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
        // Merge into single PDF
        const pdfBytes = await convertImagesToPdf(images, settings, (pct, curr, total) => {
          setProgressPct(pct);
          setProgressStatus(`Encoding page ${curr} of ${total}...`);
        });

        setGeneratedPdfBytes(pdfBytes);
        setIsPreviewOpen(true);

        // Record in IndexedDB recent projects
        await addRecentProject({
          toolId: 'image-to-pdf',
          name: `${settings.filename}.pdf`,
          itemCount: images.length,
          fileSizeTotal: pdfBytes.byteLength,
        });
      } else {
        // One PDF per image, download as ZIP
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Tool Header */}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            >
              <Settings2 className="h-4 w-4" />
              <span>{showSettingsDrawer ? 'Hide Settings' : 'PDF Settings'}</span>
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

      {/* Main Workspace */}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area (Thumbnails Grid + Top Toolbar) */}
          <div className={showSettingsDrawer ? 'lg:col-span-3' : 'lg:col-span-4'}>
            {/* Action Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              {/* Left: Multi-select & Bulk tools */}
              <div className="flex items-center gap-2">
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

              {/* Right: Undo/Redo & Sort */}
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

            {/* Sortable Grid */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((item, index) => (
                    <SortableImageCard
                      key={item.id}
                      item={item}
                      index={index}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelect={handleToggleSelect}
                      onRotate={handleRotate}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onEdit={(it) => setEditingItem(it)}
                      onZoom={(it) => setZoomItem(it)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Settings Drawer / Panel */}
          {showSettingsDrawer && (
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
            src={zoomItem.previewUrl}
            alt={zoomItem.name}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            style={{ transform: `rotate(${zoomItem.rotation || 0}deg)` }}
          />
        </div>
      )}
    </div>
  );
};
