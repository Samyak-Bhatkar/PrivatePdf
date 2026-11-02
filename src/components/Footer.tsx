import React from 'react';
import { ShieldCheck, HardDrive, Cpu, Heart } from 'lucide-react';
import type { ToolId } from '../types';

interface FooterProps {
  onSelectTool: (id: ToolId) => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTool, onOpenPrivacy }) => {
  return (
    <footer className="mt-auto border-t border-gray-200/80 bg-white py-12 dark:border-gray-800/80 dark:bg-gray-950 text-xs text-gray-500 dark:text-gray-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-8 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-white mb-2">
              <span className="text-red-600">■</span> PrivatePDF Local Engine
            </div>
            <p className="leading-relaxed">
              Every single PDF operation—rasterization, page stitching, compression, watermarking—is executed entirely within your browser's sandboxed JavaScript runtime.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Top Converters</h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onSelectTool('image-to-pdf')}
                  className="hover:text-red-600 transition"
                >
                  Image to PDF (JPG, PNG, WEBP)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTool('pdf-to-images')}
                  className="hover:text-red-600 transition"
                >
                  PDF to Images (JPG / PNG)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTool('merge-pdf')}
                  className="hover:text-red-600 transition"
                >
                  Merge Multiple PDFs
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTool('split-pdf')}
                  className="hover:text-red-600 transition"
                >
                  Split PDF Pages
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Edit & Secure</h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onSelectTool('organize-pdf')}
                  className="hover:text-red-600 transition"
                >
                  Organize & Reorder Pages
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTool('compress-pdf')}
                  className="hover:text-red-600 transition"
                >
                  Compress PDF Size
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTool('sign-pdf')}
                  className="hover:text-red-600 transition"
                >
                  Sign PDF Online
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTool('watermark')}
                  className="hover:text-red-600 transition"
                >
                  Add Custom Watermark
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Security Architecture</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-4 w-4" />
                <span>Zero Data Transmission</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-gray-400" />
                <span>Local WebAssembly & Canvas</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-gray-400" />
                <span>In-Memory RAM Only</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="flex items-center justify-center gap-1">
            Built with <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" /> for complete document privacy & safety.
          </p>
          <div className="flex items-center gap-4">
            <button onClick={onOpenPrivacy} className="underline hover:text-red-600">
              Privacy Architecture
            </button>
            <span>•</span>
            <span>Local PWA v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
