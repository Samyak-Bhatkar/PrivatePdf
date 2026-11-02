import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  RotateCw,
  RotateCcw,
  Crop,
  Copy,
  Trash2,
  ZoomIn,
  MoreVertical,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide-react';
import type { ImageItem } from '../types';
import { formatBytes } from '../utils/imageEngine';

interface SortableImageCardProps {
  item: ImageItem;
  index: number;
  isSelected: boolean;
  isArrangeMode?: boolean;
  density?: 1 | 2 | 3;
  highResThumbUrl?: string;
  hasSelectionActive?: boolean;
  onToggleSelect: (id: string) => void;
  onRotate: (id: string, degrees: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit: (item: ImageItem) => void;
  onZoom: (item: ImageItem) => void;
  onOpenViewer?: (index: number) => void;
  onMoveToPosition?: (index: number) => void;
  onMoveToFirst?: (id: string) => void;
  onMoveToLast?: (id: string) => void;
}

export const SortableImageCard: React.FC<SortableImageCardProps> = ({
  item,
  index,
  isSelected,
  isArrangeMode = false,
  density = 2,
  highResThumbUrl,
  hasSelectionActive = false,
  onToggleSelect,
  onRotate,
  onDelete,
  onDuplicate,
  onEdit,
  onZoom,
  onOpenViewer,
  onMoveToPosition,
  onMoveToFirst,
  onMoveToLast,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'manipulation',
  };

  const displayImageSrc = highResThumbUrl || item.previewUrl;

  // ----------------------------------------------------
  // ARRANGE MODE TILE (Clean, photo fills tile, readable text)
  // ----------------------------------------------------
  if (isArrangeMode) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border overflow-hidden bg-white shadow-sm select-none transition-all duration-200 dark:bg-gray-900 cursor-pointer ${
          isSelected
            ? 'border-red-500 ring-2 ring-red-500/40'
            : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
        }`}
        onClick={() => onOpenViewer?.(index)}
      >
        {/* Top-Left: Page Number Badge (clickable to jump) */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToPosition?.(index);
            }}
            title={`Page ${index + 1} - Tap to move`}
            aria-label={`Page ${index + 1}. Tap to move position`}
            className="flex h-7 min-w-7 items-center justify-center rounded-full bg-black/75 px-2 text-xs font-black text-white shadow-md backdrop-blur-md hover:bg-red-600 hover:scale-105 active:scale-95 transition-all"
          >
            {index + 1}
          </button>

          {/* Selection Checkbox (visible if selection active or hovered) */}
          {(hasSelectionActive || isSelected) && (
            <label
              className="flex items-center cursor-pointer p-0.5 rounded-full bg-black/50 backdrop-blur-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`Select page ${index + 1}`}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
            </label>
          )}
        </div>

        {/* Top-Right: Drag Handle + Overflow Menu */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          {/* Quick Overflow menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label={`Page options for page ${index + 1}`}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md opacity-80 hover:opacity-100 transition hover:bg-black/80"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-gray-200 bg-white p-1 text-xs shadow-xl dark:border-gray-800 dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                {onMoveToFirst && (
                  <button
                    type="button"
                    onClick={() => {
                      onMoveToFirst(item.id);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ArrowUpToLine className="h-3.5 w-3.5 text-red-500" />
                    <span>Move to first</span>
                  </button>
                )}
                {onMoveToLast && (
                  <button
                    type="button"
                    onClick={() => {
                      onMoveToLast(item.id);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5 text-red-500" />
                    <span>Move to last</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onMoveToPosition?.(index);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span>Move to...</span>
                </button>
                <div className="my-1 h-[1px] bg-gray-100 dark:bg-gray-800" />
                <button
                  type="button"
                  onClick={() => {
                    onRotate(item.id, 90);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Rotate 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(item.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            type="button"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Drag page ${index + 1}`}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md cursor-grab active:cursor-grabbing hover:bg-black/80 transition"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Clean Page Image Canvas filling container */}
        <div
          className={`w-full flex items-center justify-center p-1.5 bg-gray-50/70 dark:bg-gray-950/60 overflow-hidden ${
            density === 1 ? 'aspect-3/4 min-h-[360px]' : density === 2 ? 'aspect-3/4 min-h-[220px]' : 'aspect-3/4 min-h-[160px]'
          }`}
        >
          <div
            className="relative flex items-center justify-center max-h-full max-w-full transition-transform duration-200"
            style={{ transform: `rotate(${item.rotation || 0}deg)` }}
          >
            <img
              src={displayImageSrc}
              alt={item.name}
              className="max-h-full w-auto object-contain rounded shadow-xs pointer-events-none"
              loading="lazy"
            />
            {item.filterMode && item.filterMode !== 'normal' && (
              <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[8px] font-semibold text-white uppercase tracking-wider backdrop-blur-xs">
                {item.filterMode}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STANDARD DETAILED CARD (Current default mode)
  // ----------------------------------------------------
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col rounded-2xl border bg-white shadow-sm transition-all dark:bg-gray-900 ${
        isSelected
          ? 'border-red-500 ring-2 ring-red-500/30'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
      }`}
    >
      {/* Top Header Row with Page Badge, Multi-select Checkbox, and Drag Handle */}
      <div className="flex items-center justify-between p-2.5 pb-1 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
          </label>
          <button
            type="button"
            onClick={() => onMoveToPosition?.(index)}
            title="Tap to move position"
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-700 hover:bg-red-200 dark:bg-red-950/70 dark:text-red-400"
          >
            {index + 1}
          </button>
        </div>

        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder page ${index + 1}`}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Image Preview Container */}
      <div
        className="relative flex aspect-3/4 items-center justify-center overflow-hidden bg-gray-50/70 p-2 dark:bg-gray-950/50 cursor-pointer"
        onClick={() => onOpenViewer?.(index)}
      >
        <div
          className="relative max-h-full max-w-full transition-transform duration-200"
          style={{ transform: `rotate(${item.rotation || 0}deg)` }}
        >
          <img
            src={displayImageSrc}
            alt={item.name}
            className="max-h-48 w-auto rounded object-contain shadow-xs pointer-events-none"
            loading="lazy"
          />
          {item.filterMode && item.filterMode !== 'normal' && (
            <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-white uppercase tracking-wider backdrop-blur-xs">
              {item.filterMode}
            </span>
          )}
        </div>

        {/* Zoom button overlay on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoom(item);
          }}
          className="absolute top-2 right-2 rounded-xl bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          title="Zoom image"
          aria-label={`Zoom image ${item.name}`}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Info: Name & Specs */}
      <div className="px-3 py-1.5">
        <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200" title={item.name}>
          {item.name}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          {item.width} × {item.height} • {formatBytes(item.size)}
        </p>
      </div>

      {/* Card Action Bar */}
      <div className="grid grid-cols-5 gap-0.5 border-t border-gray-100 p-1 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/60 rounded-b-2xl text-gray-600 dark:text-gray-400">
        <button
          type="button"
          onClick={() => onRotate(item.id, -90)}
          title="Rotate Left 90°"
          aria-label="Rotate left"
          className="flex h-8 items-center justify-center rounded-lg hover:bg-white hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onRotate(item.id, 90)}
          title="Rotate Right 90°"
          aria-label="Rotate right"
          className="flex h-8 items-center justify-center rounded-lg hover:bg-white hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white transition"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onEdit(item)}
          title="Crop & Filters"
          aria-label="Edit and Crop"
          className="flex h-8 items-center justify-center rounded-lg hover:bg-white hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white transition"
        >
          <Crop className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onDuplicate(item.id)}
          title="Duplicate Page"
          aria-label="Duplicate"
          className="flex h-8 items-center justify-center rounded-lg hover:bg-white hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white transition"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(item.id)}
          title="Delete Page"
          aria-label="Delete page"
          className="flex h-8 items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
