import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  Sliders,
  Crop as CropIcon,
  Sun,
  FileCheck,
  X,
  Check,
  RotateCcw as ResetIcon,
  Sparkles,
} from 'lucide-react';
import type { ImageItem } from '../types';

interface ImageEditModalProps {
  item: ImageItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: ImageItem) => void;
}

export const ImageEditModal: React.FC<ImageEditModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !item) return null;

  const [rotation, setRotation] = useState(item.rotation || 0);
  const [brightness, setBrightness] = useState(item.brightness ?? 1.0);
  const [contrast, setContrast] = useState(item.contrast ?? 1.0);
  const [filterMode, setFilterMode] = useState<'normal' | 'scan' | 'grayscale' | 'bw'>(
    item.filterMode || 'normal'
  );

  // Aspect ratio presets for crop box
  const [aspectPreset, setAspectPreset] = useState<'free' | '1:1' | '4:3' | '16:9' | 'a4'>('free');
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | undefined>(
    item.cropBox
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw preview whenever settings change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const rot = (rotation % 360 + 360) % 360;
      const is90or270 = rot === 90 || rot === 270;

      let srcX = cropBox ? cropBox.x : 0;
      let srcY = cropBox ? cropBox.y : 0;
      let srcW = cropBox ? cropBox.width : img.naturalWidth;
      let srcH = cropBox ? cropBox.height : img.naturalHeight;

      // Scale down canvas for preview smoothness if original is massive
      const maxDim = 800;
      const baseW = is90or270 ? srcH : srcW;
      const baseH = is90or270 ? srcW : srcH;
      const scale = Math.min(1, maxDim / Math.max(baseW, baseH));

      canvas.width = Math.round(baseW * scale);
      canvas.height = Math.round(baseH * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);

      const drawW = srcW * scale;
      const drawH = srcH * scale;

      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcW,
        srcH,
        -drawW / 2,
        -drawH / 2,
        drawW,
        drawH
      );
      ctx.restore();

      // Apply image filters (brightness, contrast, scan mode)
      if (brightness !== 1.0 || contrast !== 1.0 || filterMode !== 'normal') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          let r = d[i];
          let g = d[i + 1];
          let b = d[i + 2];

          if (brightness !== 1.0) {
            r = r * brightness;
            g = g * brightness;
            b = b * brightness;
          }

          if (contrast !== 1.0) {
            r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
          }

          if (filterMode === 'grayscale') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = gray;
          } else if (filterMode === 'scan') {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            if (gray > 165) gray = 255;
            else if (gray < 85) gray = Math.max(0, gray * 0.7);
            else gray = ((gray - 85) / 80) * 255;
            r = g = b = gray;
          } else if (filterMode === 'bw') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const bw = gray > 135 ? 255 : 0;
            r = g = b = bw;
          }

          d[i] = Math.min(255, Math.max(0, r));
          d[i + 1] = Math.min(255, Math.max(0, g));
          d[i + 2] = Math.min(255, Math.max(0, b));
        }

        ctx.putImageData(imgData, 0, 0);
      }
    };
    img.src = item.previewUrl;
  }, [item, rotation, brightness, contrast, filterMode, cropBox]);

  const handleApplyPresetCrop = (preset: 'free' | '1:1' | '4:3' | '16:9' | 'a4') => {
    setAspectPreset(preset);
    if (preset === 'free') {
      setCropBox(undefined);
      return;
    }

    // Set centered crop box based on aspect ratio
    let targetRatio = 1;
    if (preset === '1:1') targetRatio = 1;
    else if (preset === '4:3') targetRatio = 4 / 3;
    else if (preset === '16:9') targetRatio = 16 / 9;
    else if (preset === 'a4') targetRatio = 1 / 1.414; // A4 portrait

    const origW = item.width;
    const origH = item.height;
    const curRatio = origW / origH;

    let newW = origW;
    let newH = origH;

    if (curRatio > targetRatio) {
      newW = Math.round(origH * targetRatio);
      newH = origH;
    } else {
      newW = origW;
      newH = Math.round(origW / targetRatio);
    }

    const newX = Math.round((origW - newW) / 2);
    const newY = Math.round((origH - newH) / 2);

    setCropBox({ x: newX, y: newY, width: newW, height: newH });
  };

  const handleReset = () => {
    setRotation(0);
    setBrightness(1.0);
    setContrast(1.0);
    setFilterMode('normal');
    setCropBox(undefined);
    setAspectPreset('free');
  };

  const handleSave = () => {
    onSave({
      ...item,
      rotation,
      brightness,
      contrast,
      filterMode,
      cropBox,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-image-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-red-600" />
            <h2 id="edit-image-title" className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md">
              Edit: {item.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close edit modal"
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Left Canvas Preview, Right Controls */}
        <div className="flex flex-1 flex-col md:flex-row overflow-y-auto">
          {/* Canvas Preview Area */}
          <div className="flex flex-1 items-center justify-center bg-gray-100 p-4 dark:bg-gray-950 overflow-hidden min-h-[280px]">
            <canvas
              ref={canvasRef}
              className="max-h-[50vh] md:max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
            />
          </div>

          {/* Controls Sidebar */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-900/60 overflow-y-auto space-y-6">
            {/* Quick Rotate Buttons */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Orientation
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <RotateCw className="h-4 w-4" />
                  <span>+90°</span>
                </button>
              </div>
            </div>

            {/* Document Scan Mode Filter */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <span>Filter / Mode</span>
                {filterMode === 'scan' && (
                  <span className="flex items-center gap-1 text-[10px] text-red-600 font-bold">
                    <Sparkles className="h-3 w-3" /> Enhanced
                  </span>
                )}
              </label>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  { id: 'normal', label: 'Original' },
                  { id: 'scan', label: 'Crisp Scan' },
                  { id: 'grayscale', label: 'Grayscale' },
                  { id: 'bw', label: 'B & W' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterMode(f.id as any)}
                    className={`rounded-xl py-2 text-xs font-semibold transition ${
                      filterMode === f.id
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brightness Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <span>Brightness</span>
                <span>{Math.round(brightness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="mt-2 w-full accent-red-600 cursor-pointer"
              />
            </div>

            {/* Contrast Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <span>Contrast</span>
                <span>{Math.round(contrast * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                className="mt-2 w-full accent-red-600 cursor-pointer"
              />
            </div>

            {/* Crop Aspect Ratio Presets */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Crop Ratio
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(['free', '1:1', '4:3', '16:9', 'a4'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => handleApplyPresetCrop(ratio)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium uppercase transition ${
                      aspectPreset === ratio
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <ResetIcon className="h-4 w-4" />
            <span>Reset All</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-red-600/20 hover:bg-red-700 active:scale-95 transition"
            >
              <Check className="h-4 w-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
