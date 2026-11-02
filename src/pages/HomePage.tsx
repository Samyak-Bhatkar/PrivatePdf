import React, { useState, useEffect } from 'react';
import {
  FileImage,
  Layers,
  Scissors,
  ArrowUpDown,
  Minimize2,
  Image as ImageIcon,
  RotateCw,
  Hash,
  Stamp,
  Crop,
  PenTool,
  Lock,
  Search,
  ShieldCheck,
  Zap,
  HardDrive,
  Clock,
  Trash2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { ToolDef, ToolId, ToolCategory, RecentProject } from '../types';
import { getRecentProjects, deleteRecentProject } from '../utils/storage';
import { formatBytes } from '../utils/imageEngine';

export const TOOLS: ToolDef[] = [
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    category: 'convert',
    description: 'Convert JPG, PNG, WEBP, GIF, and camera photos into clean PDFs.',
    badge: 'Popular',
    iconColor: '#E5322D',
    bgColor: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    category: 'organize',
    description: 'Combine multiple PDFs into a single document in any custom order.',
    badge: 'Fast',
    iconColor: '#EF4444',
    bgColor: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    category: 'organize',
    description: 'Extract selected pages, page ranges, or separate into chunks.',
    iconColor: '#F97316',
    bgColor: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
  },
  {
    id: 'organize-pdf',
    name: 'Organize Pages',
    category: 'organize',
    description: 'Sort, drag-and-drop, delete, rotate, and insert blank pages.',
    badge: 'Interactive',
    iconColor: '#3B82F6',
    bgColor: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'optimize',
    description: 'Shrink file size locally with Extreme, Recommended, or Low presets.',
    iconColor: '#10B981',
    bgColor: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to Images',
    category: 'convert',
    description: 'Render every PDF page into high-resolution JPG or PNG pictures.',
    iconColor: '#8B5CF6',
    bgColor: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'edit',
    description: 'Permanently rotate pages 90°, 180°, or 270° clockwise or counterclockwise.',
    iconColor: '#EC4899',
    bgColor: 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400',
  },
  {
    id: 'page-numbers',
    name: 'Add Page Numbers',
    category: 'edit',
    description: 'Insert customizable numbers, positions, and page counts.',
    iconColor: '#6366F1',
    bgColor: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  },
  {
    id: 'watermark',
    name: 'Add Watermark',
    category: 'edit',
    description: 'Stamp diagonal text marks or transparent image logos over pages.',
    iconColor: '#14B8A6',
    bgColor: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  },
  {
    id: 'crop-pdf',
    name: 'Crop Pages',
    category: 'edit',
    description: 'Trim margins and crop PDF page dimensions with real-time visual frames.',
    iconColor: '#F59E0B',
    bgColor: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  },
  {
    id: 'sign-pdf',
    name: 'Sign PDF',
    category: 'edit',
    description: 'Draw, type cursive, or upload your signature and stamp onto any page.',
    badge: 'Touch-Friendly',
    iconColor: '#06B6D4',
    bgColor: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400',
  },
  {
    id: 'protect-pdf',
    name: 'Protect PDF',
    category: 'security',
    description: 'Set password policies and local document restriction permissions.',
    iconColor: '#64748B',
    bgColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
];

const CATEGORIES: { id: ToolCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Tools' },
  { id: 'convert', label: 'Convert' },
  { id: 'organize', label: 'Organize' },
  { id: 'edit', label: 'Edit' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'security', label: 'Security' },
];

export const HomePage: React.FC<{
  onSelectTool: (id: ToolId) => void;
  onOpenPrivacy: () => void;
}> = ({ onSelectTool, onOpenPrivacy }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    (async () => {
      const recents = await getRecentProjects();
      setRecentProjects(recents);
    })();
  }, []);

  const handleDeleteRecent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteRecentProject(id);
    setRecentProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const filteredTools = TOOLS.filter((tool) => {
    const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getToolIcon = (id: ToolId) => {
    switch (id) {
      case 'image-to-pdf':
        return <FileImage className="h-6 w-6" />;
      case 'merge-pdf':
        return <Layers className="h-6 w-6" />;
      case 'split-pdf':
        return <Scissors className="h-6 w-6" />;
      case 'organize-pdf':
        return <ArrowUpDown className="h-6 w-6" />;
      case 'compress-pdf':
        return <Minimize2 className="h-6 w-6" />;
      case 'pdf-to-images':
        return <ImageIcon className="h-6 w-6" />;
      case 'rotate-pdf':
        return <RotateCw className="h-6 w-6" />;
      case 'page-numbers':
        return <Hash className="h-6 w-6" />;
      case 'watermark':
        return <Stamp className="h-6 w-6" />;
      case 'crop-pdf':
        return <Crop className="h-6 w-6" />;
      case 'sign-pdf':
        return <PenTool className="h-6 w-6" />;
      case 'protect-pdf':
        return <Lock className="h-6 w-6" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50/80 px-4 py-1.5 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 mb-4">
          <ShieldCheck className="h-4 w-4" />
          <span>100% In-Browser Privacy • Zero Server Uploads</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
          Every tool you need to work with PDFs{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-500 to-red-600">
            100% Privately.
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Convert, merge, split, compress, organize, watermark, and sign PDF documents directly in your browser. Your files never leave your device.
        </p>

        {/* Search Bar */}
        <div className="mt-8 relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 12 PDF tools (e.g., Image to PDF, Merge, Compress...)"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Projects Row if any exist */}
      {recentProjects.length > 0 && searchQuery === '' && selectedCategory === 'all' && (
        <div className="mb-10 rounded-3xl border border-gray-200 bg-white/70 p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-red-500" />
              <span>Recent Local Projects</span>
            </h3>
            <span className="text-[11px] text-gray-400">Stored safely in local IndexedDB</span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {recentProjects.slice(0, 4).map((proj) => (
              <div
                key={proj.id}
                onClick={() => onSelectTool(proj.toolId)}
                className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3 hover:border-red-300 hover:bg-red-50/20 cursor-pointer transition dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate text-xs font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition">
                    {proj.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {proj.itemCount} pages • {proj.fileSizeTotal ? formatBytes(proj.fileSizeTotal) : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteRecent(e, proj.id)}
                  title="Remove from history"
                  className="rounded p-1 text-gray-400 hover:text-red-600 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {filteredTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="group relative flex flex-col text-left rounded-3xl border border-gray-200/90 bg-white p-6 shadow-sm hover:shadow-xl hover:border-red-300 hover:-translate-y-1 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-red-900 focus:outline-none focus:ring-4 focus:ring-red-500/10"
          >
            {/* Top row with icon and badge */}
            <div className="flex items-start justify-between">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tool.bgColor} transition-transform group-hover:scale-110 shadow-xs`}
              >
                {getToolIcon(tool.id)}
              </div>

              {tool.badge && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-400">
                  {tool.badge}
                </span>
              )}
            </div>

            {/* Title & Description */}
            <h3 className="mt-5 text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">
              {tool.name}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {tool.description}
            </p>

            {/* Bottom action indicator */}
            <div className="mt-6 flex items-center text-xs font-bold text-red-600 group-hover:translate-x-1 transition-transform">
              <span>Open tool</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </div>
          </button>
        ))}
      </div>

      {/* Privacy Banner Highlight */}
      <div className="mt-16 rounded-3xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 p-6 sm:p-8 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-teal-950/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-emerald-950 dark:text-emerald-200">
                Guaranteed Complete Privacy
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-300/80 max-w-xl leading-relaxed">
                Most PDF converters secretly upload your personal tax forms, invoices, contracts, and IDs to remote cloud servers. PrivatePDF executes 100% inside your local browser memory.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenPrivacy}
            className="shrink-0 flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-emerald-900 shadow-sm hover:bg-emerald-50 transition border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800"
          >
            <span>Learn How It Works</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
