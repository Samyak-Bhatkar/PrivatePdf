import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Type,
  Upload,
  Eraser,
  Sparkles,
  Check,
  Move,
  FileCheck,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { getPdfPageCount, renderPdfPageToDataUrl } from '../lib/pdfjs';
import { signPdfPage } from '../utils/pdfEngine';
import { addRecentProject } from '../utils/storage';

export const SignPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [targetPage, setTargetPage] = useState(1);
  const [pageThumbUrl, setPageThumbUrl] = useState<string | null>(null);

  // Signature creation mode: 'draw' | 'type' | 'upload'
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('Alex Mercer');
  const [typedFont, setTypedFont] = useState<'cursive' | 'serif' | 'sans-serif'>('cursive');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Placement coordinates on page (% from left, % from bottom, and width %)
  const [placement, setPlacement] = useState({
    xPct: 55,
    yPct: 15,
    widthPct: 30,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [signedBytes, setSignedBytes] = useState<Uint8Array | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Canvas drawing ref
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Load target page thumbnail
  useEffect(() => {
    if (!buffer) return;
    (async () => {
      try {
        const thumb = await renderPdfPageToDataUrl(buffer, targetPage, 0.75);
        setPageThumbUrl(thumb);
      } catch (err) {
        console.error('Failed to render page for signing:', err);
      }
    })();
  }, [buffer, targetPage]);

  const handleFileSelected = async (files: File[]) => {
    const target = files[0];
    if (!target) return;
    setFile(target);
    const buf = new Uint8Array(await target.arrayBuffer());
    setBuffer(buf);

    try {
      const count = await getPdfPageCount(buf);
      setPageCount(count);
      setTargetPage(count); // default to last page where signatures often go
    } catch (e) {
      console.error(e);
    }
  };

  // Drawing canvas logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b'; // deep ink navy/black
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = drawCanvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureDataUrl(null);
    }
  };

  // Generate typed signature image
  const generateTypedSignature = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 400, 150);
    ctx.fillStyle = '#0f172a';
    ctx.font = typedFont === 'cursive' ? 'italic 46px "Brush Script MT", cursive' : '40px serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(typedName, 200, 75);

    const url = canvas.toDataURL('image/png');
    setSignatureDataUrl(url);
  };

  // Upload signature image
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setSignatureDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplySignature = async () => {
    if (!buffer || !file || !signatureDataUrl) {
      alert('Please create or select a signature first.');
      return;
    }
    setIsProcessing(true);

    try {
      const base64 = signatureDataUrl.split(',')[1];
      const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const signed = await signPdfPage(buffer, sigBytes, {
        pageIndex: targetPage - 1,
        xPct: placement.xPct,
        yPct: placement.yPct,
        widthPct: placement.widthPct,
      });

      setSignedBytes(signed);
      setIsPreviewOpen(true);

      await addRecentProject({
        toolId: 'sign-pdf',
        name: `${file.name.replace(/\.[^/.]+$/, '')}_signed.pdf`,
        itemCount: pageCount,
        fileSizeTotal: signed.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to sign PDF:', err);
      alert('Error signing PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
              EDIT
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Sign PDF
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your signature by drawing, typing, or uploading, then place and resize it onto any page.
          </p>
        </div>

        {buffer && signatureDataUrl && (
          <button
            disabled={isProcessing}
            onClick={handleApplySignature}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isProcessing ? 'Signing...' : 'Sign & Download PDF'}</span>
          </button>
        )}
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF to sign"
          subtitle="Choose the document where you need to attach your signature"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Document Viewport with interactive signature stamp */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="mb-3 flex items-center justify-between w-full px-2 text-xs font-semibold text-gray-500">
              <span>Preview (Page {targetPage} of {pageCount})</span>
              <div className="flex items-center gap-2">
                <label className="text-xs">Page:</label>
                <select
                  value={targetPage}
                  onChange={(e) => setTargetPage(parseInt(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                  {Array.from({ length: pageCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 p-2 overflow-hidden flex items-center justify-center">
              {pageThumbUrl && (
                <img
                  src={pageThumbUrl}
                  alt={`Page ${targetPage}`}
                  className="w-full object-contain rounded"
                />
              )}

              {/* Placed signature overlay */}
              {signatureDataUrl && (
                <div
                  className="absolute pointer-events-none transition-all"
                  style={{
                    left: `${placement.xPct}%`,
                    bottom: `${placement.yPct}%`,
                    width: `${placement.widthPct}%`,
                  }}
                >
                  <div className="rounded border border-red-500 border-dashed bg-red-500/10 p-1">
                    <img src={signatureDataUrl} alt="Signature stamp" className="w-full object-contain" />
                  </div>
                </div>
              )}
            </div>

            {/* Placement Sliders */}
            {signatureDataUrl && (
              <div className="mt-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 text-xs dark:border-gray-800 dark:bg-gray-900 space-y-3">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Move className="h-4 w-4 text-red-600" />
                  <span>Signature Position & Size</span>
                </h4>
                <div>
                  <div className="flex justify-between text-gray-500">
                    <span>Horizontal (X): {placement.xPct}%</span>
                    <span>Vertical (Y): {placement.yPct}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <input
                      type="range"
                      min="5"
                      max="75"
                      value={placement.xPct}
                      onChange={(e) => setPlacement({ ...placement, xPct: parseInt(e.target.value) })}
                      className="accent-red-600"
                    />
                    <input
                      type="range"
                      min="5"
                      max="85"
                      value={placement.yPct}
                      onChange={(e) => setPlacement({ ...placement, yPct: parseInt(e.target.value) })}
                      className="accent-red-600"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-gray-500">
                    <span>Width Scale:</span>
                    <span>{placement.widthPct}% of page</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    value={placement.widthPct}
                    onChange={(e) => setPlacement({ ...placement, widthPct: parseInt(e.target.value) })}
                    className="mt-1 w-full accent-red-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Signature Creation Panel */}
          <div className="lg:col-span-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5 h-fit">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PenTool className="h-4 w-4 text-red-600" />
              <span>Create Signature</span>
            </h3>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSigMode('draw')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${
                  sigMode === 'draw' ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>Draw</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSigMode('type');
                  generateTypedSignature();
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${
                  sigMode === 'type' ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Type className="h-3.5 w-3.5" />
                <span>Type</span>
              </button>
              <button
                type="button"
                onClick={() => setSigMode('upload')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${
                  sigMode === 'upload' ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Draw mode */}
            {sigMode === 'draw' && (
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Sign with your mouse, trackpad, or finger:</span>
                  <button
                    onClick={clearDrawing}
                    className="flex items-center gap-1 text-red-600 hover:underline font-semibold"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
                <canvas
                  ref={drawCanvasRef}
                  width={340}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-200 bg-white dark:border-gray-700 cursor-crosshair touch-none"
                />
              </div>
            )}

            {/* Type mode */}
            {sigMode === 'type' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Your Full Name</label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => {
                      setTypedName(e.target.value);
                    }}
                    onBlur={generateTypedSignature}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateTypedSignature}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
                >
                  Regenerate
                </button>
                {signatureDataUrl && (
                  <div className="h-20 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center p-2 dark:bg-gray-950 dark:border-gray-800">
                    <img src={signatureDataUrl} alt="Typed Signature" className="max-h-full" />
                  </div>
                )}
              </div>
            )}

            {/* Upload mode */}
            {sigMode === 'upload' && (
              <div>
                <label className="text-xs font-semibold text-gray-500">Upload Signature (PNG / JPG)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleSignatureUpload}
                  className="mt-2 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                />
              </div>
            )}

            <button
              disabled={isProcessing || !signatureDataUrl}
              onClick={handleApplySignature}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
            >
              <Check className="h-5 w-5" />
              <span>Place Signature & Download</span>
            </button>
          </div>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={signedBytes}
        filename={`${file?.name.replace(/\.[^/.]+$/, '')}_signed.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
