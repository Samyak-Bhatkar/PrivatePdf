import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  GripVertical,
  FilePlus,
  Sparkles,
  FileText,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { renderPdfPageToDataUrl, getPdfPageCount } from '../lib/pdfjs';
import { organizePdfDocument } from '../utils/pdfEngine';
import { addRecentProject } from '../utils/storage';

interface OrganizePageItem {
  id: string;
  sourceIndex: number;
  rotation: number;
  thumbnailUrl?: string;
  isBlank?: boolean;
}

const SortableOrganizeCard: React.FC<{
  item: OrganizePageItem;
  index: number;
  onRotate: (id: string, delta: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onInsertBlankAfter: (id: string) => void;
}> = ({ item, index, onRotate, onDuplicate, onDelete, onInsertBlankAfter }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 pb-1 border-b border-gray-100 dark:border-gray-800">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-400">
          {index + 1}
        </span>
        <button
          {...attributes}
          {...listeners}
          aria-label={`Reorder page ${index + 1}`}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Thumbnail */}
      <div className="flex aspect-3/4 items-center justify-center bg-gray-50/70 p-2 dark:bg-gray-950/50">
        {item.isBlank ? (
          <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
            <FileText className="h-8 w-8 mb-1 stroke-1" />
            <span>Blank Page</span>
          </div>
        ) : (
          <div
            className="transition-transform duration-200"
            style={{ transform: `rotate(${item.rotation}deg)` }}
          >
            <img
              src={item.thumbnailUrl}
              alt={`Page ${index + 1}`}
              className="max-h-40 object-contain rounded shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="grid grid-cols-4 border-t border-gray-100 p-1 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400">
        <button
          onClick={() => onRotate(item.id, -90)}
          title="Rotate Left"
          className="flex h-7 items-center justify-center rounded hover:bg-white hover:text-gray-900 dark:hover:bg-gray-800"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
        <button
          onClick={() => onRotate(item.id, 90)}
          title="Rotate Right"
          className="flex h-7 items-center justify-center rounded hover:bg-white hover:text-gray-900 dark:hover:bg-gray-800"
        >
          <RotateCw className="h-3 w-3" />
        </button>
        <button
          onClick={() => onDuplicate(item.id)}
          title="Duplicate Page"
          className="flex h-7 items-center justify-center rounded hover:bg-white hover:text-gray-900 dark:hover:bg-gray-800"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          title="Delete Page"
          className="flex h-7 items-center justify-center rounded hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Quick Add Blank button on hover between items */}
      <button
        onClick={() => onInsertBlankAfter(item.id)}
        className="text-[10px] py-0.5 text-center bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition dark:bg-gray-800"
        title="Insert blank page after this"
      >
        + Blank Page
      </button>
    </div>
  );
};

export const OrganizePdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<OrganizePageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleFileSelected = async (files: File[]) => {
    const target = files[0];
    if (!target) return;

    setFile(target);
    const buf = new Uint8Array(await target.arrayBuffer());
    setBuffer(buf);

    setLoading(true);
    try {
      const count = await getPdfPageCount(buf);
      const pageItems: OrganizePageItem[] = [];

      for (let i = 1; i <= count; i++) {
        const thumb = await renderPdfPageToDataUrl(buf, i, 0.4);
        pageItems.push({
          id: `p_${i}_${Date.now()}`,
          sourceIndex: i - 1,
          rotation: 0,
          thumbnailUrl: thumb,
        });
      }

      setPages(pageItems);
    } catch (e) {
      console.error('Failed to load PDF for organize:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      setPages(arrayMove(pages, oldIndex, newIndex));
    }
  };

  const handleRotate = (id: string, delta: number) => {
    setPages(
      pages.map((p) =>
        p.id === id ? { ...p, rotation: ((p.rotation + delta + 360) % 360) } : p
      )
    );
  };

  const handleDuplicate = (id: string) => {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const item = pages[idx];
    const dup: OrganizePageItem = {
      ...item,
      id: `p_dup_${Date.now()}_${Math.random()}`,
    };
    const next = [...pages];
    next.splice(idx + 1, 0, dup);
    setPages(next);
  };

  const handleDelete = (id: string) => {
    if (pages.length <= 1) {
      alert('Document must contain at least one page.');
      return;
    }
    setPages(pages.filter((p) => p.id !== id));
  };

  const handleInsertBlankAfter = (id: string) => {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const blank: OrganizePageItem = {
      id: `p_blank_${Date.now()}`,
      sourceIndex: -1,
      rotation: 0,
      isBlank: true,
    };
    const next = [...pages];
    next.splice(idx + 1, 0, blank);
    setPages(next);
  };

  const handleSaveOrganized = async () => {
    if (!buffer || pages.length === 0) return;
    setIsProcessing(true);

    try {
      const ops = pages.map((p) => ({
        sourcePageIndex: p.sourceIndex,
        rotationDelta: p.rotation,
        isBlank: p.isBlank,
      }));

      const newPdf = await organizePdfDocument(buffer, ops);
      setPreviewPdfBytes(newPdf);
      setIsPreviewOpen(true);

      await addRecentProject({
        toolId: 'organize-pdf',
        name: `${file?.name.replace(/\.[^/.]+$/, '')}_organized.pdf`,
        itemCount: pages.length,
        fileSizeTotal: newPdf.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to organize PDF:', err);
      alert('Error saving organized PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
              ORGANIZE
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Organize PDF Pages
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Reorder pages with drag and drop, rotate, duplicate, delete, and insert blank pages.
          </p>
        </div>

        {buffer && (
          <button
            disabled={isProcessing}
            onClick={handleSaveOrganized}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isProcessing ? 'Saving...' : 'Save & Download PDF'}</span>
          </button>
        )}
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select PDF file to organize"
          subtitle="Choose the PDF you want to reorder or rearrange pages for"
        />
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {file?.name} ({pages.length} Pages)
            </span>
            <button
              onClick={() => handleInsertBlankAfter(pages[pages.length - 1].id)}
              className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Blank Page</span>
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {pages.map((p, idx) => (
                  <SortableOrganizeCard
                    key={p.id}
                    item={p}
                    index={idx}
                    onRotate={handleRotate}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onInsertBlankAfter={handleInsertBlankAfter}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={previewPdfBytes}
        filename={`${file?.name.replace(/\.[^/.]+$/, '')}_organized.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
