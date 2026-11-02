export type ToolId =
  | 'image-to-pdf'
  | 'merge-pdf'
  | 'split-pdf'
  | 'organize-pdf'
  | 'compress-pdf'
  | 'pdf-to-images'
  | 'rotate-pdf'
  | 'page-numbers'
  | 'watermark'
  | 'crop-pdf'
  | 'sign-pdf'
  | 'protect-pdf';

export type ToolCategory = 'convert' | 'organize' | 'edit' | 'optimize' | 'security';

export interface ToolDef {
  id: ToolId;
  name: string;
  category: ToolCategory;
  description: string;
  badge?: string;
  iconColor: string;
  bgColor: string;
}

export type PageSizeOption = 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5' | 'Fit';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type MarginOption = 'none' | 'small' | 'big' | 'custom';
export type ImageFitOption = 'fit' | 'fill' | 'stretch' | 'center';
export type ImageQualityOption = 'original' | 'high' | 'medium' | 'low';

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  filterMode?: 'normal' | 'scan' | 'grayscale' | 'bw';
  brightness?: number; // 0.5 to 1.5
  contrast?: number; // 0.5 to 1.5
  cropBox?: { x: number; y: number; width: number; height: number };
}

export interface PdfPageItem {
  id: string;
  pageNumber: number;
  rotation: number;
  thumbnailUrl?: string;
  isDeleted?: boolean;
}

export interface ImageToPdfSettings {
  pageSize: PageSizeOption;
  orientation: PageOrientation;
  margin: MarginOption;
  customMarginPt: number;
  fit: ImageFitOption;
  quality: ImageQualityOption;
  bgColor: string;
  pageNumbers: 'none' | 'bottom-center' | 'bottom-right' | 'top-center';
  headerText: string;
  footerText: string;
  mergeAll: boolean; // merge into 1 PDF or output zip of individual PDFs
  filename: string;
}

export interface RecentProject {
  id: string;
  toolId: ToolId;
  name: string;
  timestamp: number;
  itemCount: number;
  fileSizeTotal?: number;
}
