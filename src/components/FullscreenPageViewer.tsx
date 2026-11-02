import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  RotateCcw,
  Crop,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import type { ImageItem } from '../types';

interface FullscreenPageViewerProps {
  isOpen: boolean;
  images: ImageItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onRotate: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ImageItem) => void;
  onMoveEarlier: (index: number) => void;
  onMoveLater: (index: number) => void;
  onOpenMoveTo: (index: number) => void;
}

export const FullscreenPageViewer: React.FC<FullscreenPageViewerProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onNavigate,
  onRotate,
  onDelete,
  onEdit,
  onMoveEarlier,
  onMoveLater,
  onOpenMoveTo,
}) => {
  if (!isOpen || images.length === 0 || !images[currentIndex]) return null;

  const currentItem = images[currentIndex];
  const [zoomScale, setZoomScale] = useState(1);
  const [isDoubleTapped, setIsDoubleTapped] = useState(false);

  // Touch Swipe & Pinch Gesture Handling
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const lastTapTime = useRef<number>(0);
  const initialPinchDistance = useRef<number | null>(null);
  const initialZoom = useRef<number>(1);
  const stripRef = useRef<HTMLDivElement>(null);

  // Scroll active thumbnail into view in mini strip
  useEffect(() => {
    if (stripRef.current) {
      const activeThumb = stripRef.current.children[currentIndex] as HTMLElement | undefined;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentIndex]);

  // Handle Android back button popstate
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ pageViewerOpen: true }, '');
      const handlePopState = () => {
        onClose();
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistance.current = Math.hypot(dx, dy);
      initialZoom.current = zoomScale;
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const ratio = currentDist / initialPinchDistance.current;
      setZoomScale(Math.max(1, Math.min(3.5, initialZoom.current * ratio)));
    } else if (e.touches.length === 1) {
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistance.current = null;
    const diffX = touchEndX.current - touchStartX.current;
    const diffY = touchEndY.current - touchStartY.current;

    // Only process swipe navigation if zoom is at 1 (not panning)
    if (zoomScale <= 1.05 && Math.abs(diffX) > 60 && Math.abs(diffY) < 100) {
      if (diffX < 0 && currentIndex < images.length - 1) {
        onNavigate(currentIndex + 1); // Swipe left -> Next
      } else if (diffX > 0 && currentIndex > 0) {
        onNavigate(currentIndex - 1); // Swipe right -> Previous
      }
    } else if (zoomScale <= 1.05 && diffY > 120 && Math.abs(diffX) < 80) {
      // Swipe down to close
      onClose();
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      if (isDoubleTapped || zoomScale > 1) {
        setZoomScale(1);
        setIsDoubleTapped(false);
      } else {
        setZoomScale(2.2);
        setIsDoubleTapped(true);
      }
    }
    lastTapTime.current = now;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full-screen page viewer"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white select-none backdrop-blur-md animate-in fade-in duration-150"
    >
      {/* Sticky Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-4 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            aria-label="Close full-screen viewer"
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition active:scale-95"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
          <span className="text-xs font-bold text-gray-300">
            Page {currentIndex + 1} of {images.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomScale((z) => Math.max(1, z - 0.3))}
            aria-label="Zoom out"
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-mono text-gray-400 min-w-10 text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => setZoomScale((z) => Math.min(3.5, z + 0.3))}
            aria-label="Zoom in"
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoomScale(1)}
            aria-label="Reset zoom"
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white text-xs font-semibold"
          >
            1x
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
      >
        {/* Left Arrow */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex - 1);
            }}
            aria-label="Previous page"
            className="absolute left-2 sm:left-4 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md hover:bg-black/90 active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* High Resolution Page Image */}
        <div
          className="flex items-center justify-center max-h-full max-w-full transition-transform duration-100 ease-out"
          style={{
            transform: `scale(${zoomScale}) rotate(${currentItem.rotation || 0}deg)`,
          }}
        >
          <img
            src={currentItem.previewUrl}
            alt={currentItem.name}
            className="max-h-[68vh] sm:max-h-[72vh] w-auto max-w-[92vw] object-contain rounded-md shadow-2xl pointer-events-none"
          />
        </div>

        {/* Right Arrow */}
        {currentIndex < images.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex + 1);
            }}
            aria-label="Next page"
            className="absolute right-2 sm:right-4 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md hover:bg-black/90 active:scale-95 transition"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Mini Thumbnails Strip */}
      <div className="shrink-0 border-t border-white/10 bg-black/80 px-2 py-2">
        <div
          ref={stripRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-2 max-w-full"
        >
          {images.map((item, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(idx)}
                aria-label={`Jump to page ${idx + 1}`}
                className={`relative shrink-0 overflow-hidden rounded-lg transition-all ${
                  isActive
                    ? 'ring-2 ring-red-500 scale-105 opacity-100'
                    : 'opacity-50 hover:opacity-80'
                }`}
                style={{ width: 44, height: 56 }}
              >
                <img
                  src={item.previewUrl}
                  alt={`Thumb ${idx + 1}`}
                  className="h-full w-full object-cover"
                  style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-bold text-center text-white py-0.5">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <footer className="border-t border-white/10 bg-gray-950/90 px-3 py-2.5 backdrop-blur-md z-20">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-1 sm:gap-2">
          {/* Reorder controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              disabled={currentIndex <= 0}
              onClick={() => onMoveEarlier(currentIndex)}
              aria-label="Move earlier"
              className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Earlier</span>
            </button>

            <button
              disabled={currentIndex >= images.length - 1}
              onClick={() => onMoveLater(currentIndex)}
              aria-label="Move later"
              className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95"
            >
              <span className="hidden xs:inline">Later</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => onOpenMoveTo(currentIndex)}
              aria-label="Move to specific position"
              className="rounded-xl border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/15 transition active:scale-95"
            >
              Move to...
            </button>
          </div>

          {/* Edit / Rotate / Delete controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => onRotate(currentItem.id, -90)}
              title="Rotate Left"
              aria-label="Rotate left 90 degrees"
              className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={() => onRotate(currentItem.id, 90)}
              title="Rotate Right"
              aria-label="Rotate right 90 degrees"
              className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition active:scale-95"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => {
                onClose();
                onEdit(currentItem);
              }}
              title="Crop & Filters"
              aria-label="Edit and Crop"
              className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition active:scale-95"
            >
              <Crop className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Crop</span>
            </button>

            <button
              onClick={() => {
                onDelete(currentItem.id);
                if (images.length <= 1) {
                  onClose();
                } else if (currentIndex >= images.length - 1) {
                  onNavigate(Math.max(0, currentIndex - 1));
                }
              }}
              title="Delete Page"
              aria-label="Delete page"
              className="rounded-xl bg-red-600/30 p-2 text-red-400 hover:bg-red-600 hover:text-white transition active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
