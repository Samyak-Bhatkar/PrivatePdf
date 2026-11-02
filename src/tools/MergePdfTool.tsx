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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FileText,
  GripVertical,
  Trash2,
  Sparkles,
  FilePlus,
  ArrowUpDown,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { mergePdfDocuments } from '../utils/pdfEngine';
import { renderPdfPageToDataUrl, getPdfPageCount } from '../lib/pdfjs';
import { formatBytes } from '../utils/imageEngine';
import { addRecentProject } from '../utils/storage';

interface PdfFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  buffer: Uint8Array;
  pageCount: number;
  thumbnailUrl?: string;
}

const SortablePdfRow: React.FC<{
  item: PdfFileItem;
  index: number;
  onDelete: (id: string) => void;
}> = ({ item, index, onDelete }) => {
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
      className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-900 gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder file ${item.name}`}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 touch-none"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Thumbnail or Icon */}
        <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 overflow-hidden dark:border-gray-800 dark:bg-gray-950">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <FileText className="h-6 w-6 text-red-500" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-800 dark:text-gray-200">
            {item.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {item.pageCount} {item.pageCount === 1 ? 'Page' : 'Pages'} • {formatBytes(item.size)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700 dark:bg-red-950/70 dark:text-red-400">
          {index + 1}
        </span>
        <button
          onClick={() => onDelete(item.id)}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const MergePdfTool: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<PdfFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedPdfBytes, setMergedPdfBytes] = useState<Uint8Array | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [filename, setFilename] = useState('merged_document');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleFilesSelected = async (files: File[]) => {
    const pdfs = files.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfs.length === 0) return;

    const newItems: PdfFileItem[] = [];

    for (const file of pdfs) {
      try {
        const buffer = new Uint8Array(await file.arrayBuffer());
        const count = await getPdfPageCount(buffer);
        let thumbUrl: string | undefined;
        try {
          thumbUrl = await renderPdfPageToDataUrl(buffer, 1, 0.4);
        } catch {
          // fallback icon
        }

        newItems.push({
          id: `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          buffer,
          pageCount: count,
          thumbnailUrl: thumbUrl,
        });
      } catch (e) {
        console.error('Failed to parse PDF:', e);
      }
    }

    setPdfFiles((prev) => [...prev, ...newItems]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = pdfFiles.findIndex((i) => i.id === active.id);
      const newIndex = pdfFiles.findIndex((i) => i.id === over.id);
      setPdfFiles(arrayMove(pdfFiles, oldIndex, newIndex));
    }
  };

  const handleDelete = (id: string) => {
    setPdfFiles((prev) => prev.filter((i) => i.id !== id));
  };

  const handleMerge = async () => {
    if (pdfFiles.length < 2) {
      alert('Please add at least 2 PDF files to merge.');
      return;
    }
    setIsProcessing(true);
    try {
      const buffers = pdfFiles.map((f) => f.buffer);
      const merged = await mergePdfDocuments(buffers);
      setMergedPdfBytes(merged);
      setIsPreviewOpen(true);

      await addRecentProject({
        toolId: 'merge-pdf',
        name: `${filename}.pdf`,
        itemCount: pdfFiles.reduce((acc, curr) => acc + curr.pageCount, 0),
        fileSizeTotal: merged.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to merge PDFs:', err);
      alert('Failed to merge PDFs: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = pdfFiles.reduce((acc, curr) => acc + curr.pageCount, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
              ORGANIZE
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Merge PDF Files
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Combine multiple PDF files in any order you choose with instant client-side merging.
          </p>
        </div>

        {pdfFiles.length >= 2 && (
          <button
            disabled={isProcessing}
            onClick={handleMerge}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isProcessing ? 'Merging...' : 'Merge PDFs'}</span>
          </button>
        )}
      </div>

      {pdfFiles.length === 0 ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={true}
          onFilesSelected={handleFilesSelected}
          title="Select PDF files to merge"
          subtitle="Drag & drop multiple PDF documents, or paste them"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {pdfFiles.length} Documents ({totalPages} Total Pages)
            </span>

            <label className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 cursor-pointer dark:bg-gray-800 dark:text-gray-200">
              <FilePlus className="h-3.5 w-3.5" />
              <span>Add More PDFs</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {/* Sortable List */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pdfFiles.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2.5">
                {pdfFiles.map((item, index) => (
                  <SortablePdfRow
                    key={item.id}
                    item={item}
                    index={index}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Merge Settings & Action */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Merged File Name
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <button
              disabled={isProcessing || pdfFiles.length < 2}
              onClick={handleMerge}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
            >
              <Sparkles className="h-5 w-5" />
              <span>{isProcessing ? 'Merging Documents...' : 'Merge All Into Single PDF'}</span>
            </button>
          </div>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={mergedPdfBytes}
        filename={`${filename}.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
