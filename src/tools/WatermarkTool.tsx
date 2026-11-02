import React, { useState } from 'react';
import { Stamp, Sparkles, Image as ImageIcon } from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { getPdfPageCount } from '../lib/pdfjs';
import { addWatermarkToPdf } from '../utils/pdfEngine';
import { addRecentProject } from '../utils/storage';

export const WatermarkTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const [type, setType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.25);
  const [rotationDegrees, setRotationDegrees] = useState(45);
  const [colorHex, setColorHex] = useState('#E5322D');

  // Image watermark
  const [watermarkImageBytes, setWatermarkImageBytes] = useState<Uint8Array | null>(null);
  const [watermarkImageType, setWatermarkImageType] = useState<'png' | 'jpg'>('png');

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFileSelected = async (files: File[]) => {
    const target = files[0];
    if (!target) return;
    setFile(target);
    const buf = new Uint8Array(await target.arrayBuffer());
    setBuffer(buf);

    try {
      const count = await getPdfPageCount(buf);
      setPageCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageWatermarkSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      const bytes = new Uint8Array(await imgFile.arrayBuffer());
      setWatermarkImageBytes(bytes);
      setWatermarkImageType(imgFile.type.includes('png') ? 'png' : 'jpg');
    }
  };

  const handleApply = async () => {
    if (!buffer || !file) return;
    setIsProcessing(true);

    try {
      const watermarked = await addWatermarkToPdf(buffer, {
        type,
        text,
        fontSize,
        opacity,
        rotationDegrees,
        colorHex,
        imageBytes: watermarkImageBytes || undefined,
        imageType: watermarkImageType,
      });

      setResultBytes(watermarked);
      setIsPreviewOpen(true);

      await addRecentProject({
        toolId: 'watermark',
        name: `${file.name.replace(/\.[^/.]+$/, '')}_watermarked.pdf`,
        itemCount: pageCount,
        fileSizeTotal: watermarked.byteLength,
      });
    } catch (err: any) {
      console.error('Failed to add watermark:', err);
      alert('Error adding watermark: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
            EDIT
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Add Watermark
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Stamp text or transparent image logos over all pages of your PDF document.
        </p>
      </div>

      {!buffer ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Select a PDF to watermark"
          subtitle="Stamp confidentiality marks, logos, or status watermarks"
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-5">
            {/* Watermark Type Selector */}
            <div className="flex gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  type === 'text'
                    ? 'bg-red-600 text-white'
                    : 'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                Text Watermark
              </button>
              <button
                type="button"
                onClick={() => setType('image')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  type === 'image'
                    ? 'bg-red-600 text-white'
                    : 'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                Image / Logo Watermark
              </button>
            </div>

            {type === 'text' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL, DRAFT, SAMPLE"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['CONFIDENTIAL', 'DRAFT', 'SAMPLE', 'DO NOT COPY', 'PRIVATE'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setText(preset)}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Font Size ({fontSize}pt)</label>
                    <input
                      type="range"
                      min="24"
                      max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="mt-1 w-full accent-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">
                      Opacity ({Math.round(opacity * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.8"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="mt-1 w-full accent-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Angle</label>
                    <select
                      value={rotationDegrees}
                      onChange={(e) => setRotationDegrees(parseInt(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="45">45° Diagonal</option>
                      <option value="0">0° Horizontal</option>
                      <option value="-45">-45° Counter-diagonal</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Upload Stamp Image (PNG / JPG)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleImageWatermarkSelected}
                    className="mt-2 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">
                    Opacity ({Math.round(opacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.9"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="mt-1 w-full accent-red-600 max-w-xs"
                  />
                </div>
              </div>
            )}

            <button
              disabled={isProcessing}
              onClick={handleApply}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
            >
              <Sparkles className="h-5 w-5" />
              <span>{isProcessing ? 'Watermarking...' : 'Apply Watermark & Preview'}</span>
            </button>
          </div>
        </div>
      )}

      <PdfPreviewModal
        pdfBytes={resultBytes}
        filename={`${file?.name.replace(/\.[^/.]+$/, '')}_watermarked.pdf`}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
