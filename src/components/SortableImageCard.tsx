import React from 'react';
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
  Check,
} from 'lucide-react';
import type { ImageItem } from '../types';
import { formatBytes } from '../utils/imageEngine';

interface SortableImageCardProps {
  item: ImageItem;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRotate: (id: string, degrees: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit: (item: ImageItem) => void;
  onZoom: (item: ImageItem) => void;
  onMoveToFirst?: (id: string) => void;
  onMoveToLast?: (id: string) => void;
}

export const SortableImageCard: React.FC<SortableImageCardProps> = ({
  item,
  index,
  isSelected,
  onToggleSelect,
  onRotate,
  onDelete,
  onDuplicate,
  onEdit,
  onZoom,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

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
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-400">
            {index + 1}
          </span>
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
      <div className="relative flex aspect-3/4 items-center justify-center overflow-hidden bg-gray-50/70 p-2 dark:bg-gray-950/50">
        <div
          className="relative max-h-full max-w-full transition-transform duration-200"
          style={{ transform: `rotate(${item.rotation || 0}deg)` }}
        >
          <img
            src={item.previewUrl}
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
          onClick={() => onZoom(item)}
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
