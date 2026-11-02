import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Camera, FilePlus, AlertCircle } from 'lucide-react';

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  supportCamera?: boolean;
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept,
  multiple = true,
  onFilesSelected,
  title = 'Select files to start',
  subtitle = 'or drop files here, paste from clipboard',
  supportCamera = false,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled || !e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const pastedFiles: File[] = [];

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        onFilesSelected(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled, onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(multiple ? droppedFiles : [droppedFiles[0]]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onFilesSelected(multiple ? selected : [selected[0]]);
      e.target.value = ''; // Reset input so same file can be re-selected
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
        isDragging
          ? 'border-red-500 bg-red-50/70 dark:bg-red-950/20 scale-[1.01]'
          : 'border-gray-200 bg-white/70 hover:border-red-400 hover:bg-red-50/20 dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-red-900'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {supportCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      )}

      {/* Upload icon circle */}
      <div className="flex h-18 w-18 items-center justify-center rounded-3xl bg-red-50 text-red-600 shadow-inner dark:bg-red-950/40 dark:text-red-400 mb-4 transition-transform hover:scale-105">
        <UploadCloud className="h-9 w-9" />
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        {subtitle}
      </p>

      {/* Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 transition focus:outline-none focus:ring-4 focus:ring-red-500/20"
        >
          <FilePlus className="h-5 w-5" />
          <span>Choose {multiple ? 'Files' : 'File'}</span>
        </button>

        {supportCamera && (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Camera className="h-5 w-5 text-red-500" />
            <span>Use Camera</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        <span>Secure In-Browser Sandbox • Zero Data Upload</span>
      </div>
    </div>
  );
};
