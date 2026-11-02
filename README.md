# PrivatePDF - 100% In-Browser Privacy-First PDF Toolkit

PrivatePDF is a high-performance, privacy-first PDF and image manipulation suite that runs entirely inside the client's web browser.

**No backend servers, no cloud uploads, no telemetry, and no third-party tracking.**

---

## Features

1. **Image to PDF (Flagship)**:
   - Convert JPG, PNG, WEBP, GIF, BMP, and mobile camera photos to PDF.
   - Drag-and-drop sortable page order (@dnd-kit).
   - Per-image editor: Crop (Free, 1:1, 4:3, 16:9, A4 presets), Rotate, Brightness, Contrast, and "Scan mode" (auto-contrast filter).
   - Multi-select bulk rotate and delete.
   - Comprehensive page settings: Page size (A4, Letter, Legal, Fit, etc.), orientation, margins, image fit modes, quality estimation, page numbers.
   - Output as a single unified PDF or ZIP archive of individual PDFs.

2. **Merge PDF**: Combine multiple PDF documents with drag-and-drop reordering.
3. **Split PDF**: Split by custom page ranges (e.g., `1-3, 5, 8-10`), every N pages, or visual page selection with ZIP export.
4. **Organize / Reorder PDF**: Rearrange, rotate, delete, duplicate, and insert blank pages.
5. **Compress PDF**: Client-side canvas re-rendering with Extreme, Recommended, and Low compression presets.
6. **PDF to Images**: High-DPI export to JPG or PNG with batch ZIP download.
7. **Rotate PDF**: Permanently rotate all pages 90°, 180°, or 270°.
8. **Add Page Numbers**: Position numbers at top/bottom corners or centers with custom formatting.
9. **Add Watermark**: Diagonal/horizontal text stamps or transparent image logos.
10. **Crop Pages**: Adjust margin insets with visual page frame overlay.
11. **Sign PDF**: Draw with finger/mouse, type cursive signature, or upload stamp image, then position and scale onto any page.
12. **Protect PDF**: Client-side metadata locking and security restriction flags.

---

## Privacy & Security

- **Zero Network Traffic**: Strict Content Security Policy (`connect-src 'self'`).
- **Memory-Only Processing**: Files live in browser RAM and are discarded when closed.
- **Offline PWA**: Full progressive web app with service worker caching. Functions without internet access.
- **Local Storage**: Project history is optionally kept in private client-side IndexedDB with a one-click "Clear All Data" wipe.

---

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Lucide Icons
- **PDF Manipulation**: `pdf-lib` + `pdfjs-dist`
- **Drag & Drop**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Compression & Packaging**: `jszip`, `browser-image-compression`
- **Offline & Storage**: `vite-plugin-pwa`, `idb-keyval`

---

## Development & Build

### Install Dependencies
```bash
npm install
```

### Run Locally
```bash
npm run dev
```

### Run Tests
```bash
npx --yes tsx --test src/utils/pdfEngine.test.ts
```

### Build for Production
```bash
npm run build
```

---

## Static Site Deployment

Because PrivatePDF has no server-side requirements, the output `dist/` directory can be deployed directly to any static host:

- **Cloudflare Pages**: `npm run build`, output folder: `dist`
- **Vercel / Netlify**: static site preset, output directory: `dist`
- **GitHub Pages**: Deploy `dist/` branch or static workflow
- **Docker / Nginx**: Serve `dist/` with an `nginx:alpine` container
