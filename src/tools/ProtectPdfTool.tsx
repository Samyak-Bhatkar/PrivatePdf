import React, { useState } from 'react';
import { Lock, Shield, Sparkles, KeyRound, CheckCircle2, Download, AlertCircle, FileCheck } from 'lucide-react';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { FileDropzone } from '../components/FileDropzone';
import { getPdfPageCount } from '../lib/pdfjs';
import { addRecentProject } from '../utils/storage';
import { formatBytes } from '../utils/imageEngine';

export const ProtectPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preventCopy, setPreventCopy] = useState(true);
  const [preventPrinting, setPreventPrinting] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [protectedBlobUrl, setProtectedBlobUrl] = useState<string | null>(null);
  const [protectedSize, setProtectedSize] = useState<number>(0);

  const handleFileSelected = async (files: File[]) => {
    const target = files[0];
    if (!target) return;
    setFile(target);
    setErrorMessage(null);
    setIsDone(false);
    if (protectedBlobUrl) {
      URL.revokeObjectURL(protectedBlobUrl);
      setProtectedBlobUrl(null);
    }

    try {
      const buf = new Uint8Array(await target.arrayBuffer());
      setBuffer(buf);
      const count = await getPdfPageCount(buf);
      setPageCount(count);
    } catch (e: any) {
      console.error(e);
      setErrorMessage('Could not load PDF. Please make sure the file is not corrupted.');
    }
  };

  const triggerDirectDownload = (blob: Blob, outputFilename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a short delay so the browser finishes the file save
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleProtect = async () => {
    setErrorMessage(null);
    if (!buffer || !file) {
      setErrorMessage('Please select a PDF file first.');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsProcessing(true);
    try {
      // 100% Client-side AES-256 standard PDF encryption
      const encryptedBytes = await encryptPDF(buffer, password, {
        ownerPassword: password + '_owner',
        algorithm: 'AES-256',
        allowPrinting: !preventPrinting,
        allowHighQualityPrint: !preventPrinting,
        allowCopying: !preventCopy,
        allowModifying: false,
        allowAnnotating: false,
        allowFillingForms: false,
      });

      const blob = new Blob([encryptedBytes as any], { type: 'application/pdf' });
      const outputFilename = `${file.name.replace(/\.[^/.]+$/, '')}_protected.pdf`;

      // 1. Trigger immediate native browser download
      triggerDirectDownload(blob, outputFilename);

      // 2. Also keep a persistent blob URL and success state on screen
      const persistentUrl = URL.createObjectURL(blob);
      setProtectedBlobUrl(persistentUrl);
      setProtectedSize(encryptedBytes.byteLength);
      setIsDone(true);

      // Record in local history
      await addRecentProject({
        toolId: 'protect-pdf',
        name: outputFilename,
        itemCount: pageCount,
        fileSizeTotal: encryptedBytes.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to encrypt PDF:', err);
      setErrorMessage(err.message || 'Failed to encrypt PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
            SECURITY
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Protect PDF
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Encrypt your PDF with standard AES-256 password security directly inside your browser.
        </p>
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF to protect"
          subtitle="Choose the PDF file you want to secure with a password"
        />
      ) : (
        <div className="space-y-6">
          {/* File Information Card */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">{file?.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {pageCount} {pageCount === 1 ? 'Page' : 'Pages'} • {file ? formatBytes(file.size) : ''}
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setBuffer(null);
                setIsDone(false);
                setPassword('');
                setConfirmPassword('');
                if (protectedBlobUrl) URL.revokeObjectURL(protectedBlobUrl);
                setProtectedBlobUrl(null);
              }}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Change File
            </button>
          </div>

          {/* Success banner with manual Download button if user needs to re-download */}
          {isDone && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                      Document Protected & Downloaded!
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      Your file was encrypted with AES-256 and downloaded automatically ({formatBytes(protectedSize)}).
                    </p>
                  </div>
                </div>

                {protectedBlobUrl && (
                  <a
                    href={protectedBlobUrl}
                    download={`${file?.name.replace(/\.[^/.]+$/, '')}_protected.pdf`}
                    className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-emerald-700 active:scale-95 transition shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Again</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Settings Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Document Password (Min 4 chars)
                </label>
                <div className="relative mt-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security password"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <KeyRound className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Confirm Password
                </label>
                <div className="relative mt-2">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 dark:border-gray-800 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preventCopy}
                  onChange={(e) => setPreventCopy(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Restrict text and graphics copying
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preventPrinting}
                  onChange={(e) => setPreventPrinting(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Restrict high-resolution printing
                </span>
              </label>
            </div>

            <button
              disabled={isProcessing}
              onClick={handleProtect}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
            >
              <Lock className="h-5 w-5" />
              <span>{isProcessing ? 'Encrypting & Generating...' : 'Protect Document & Download'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
