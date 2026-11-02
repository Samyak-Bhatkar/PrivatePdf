import { get, set, del, clear } from 'idb-keyval';
import type { RecentProject, PageSizeOption, ImageQualityOption } from '../types';

const RECENTS_KEY = 'privatepdf_recent_projects';
const SETTINGS_KEY = 'privatepdf_user_settings';

export interface AppSettings {
  darkMode: 'system' | 'light' | 'dark';
  defaultPageSize: PageSizeOption;
  defaultQuality: ImageQualityOption;
  autoClearOnClose: boolean;
  clearHistoryAfterHours: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: 'system',
  defaultPageSize: 'A4',
  defaultQuality: 'high',
  autoClearOnClose: false,
  clearHistoryAfterHours: 24,
};

export async function getRecentProjects(): Promise<RecentProject[]> {
  try {
    const list = await get<RecentProject[]>(RECENTS_KEY);
    return list || [];
  } catch (err) {
    console.warn('Failed to load recents from IndexedDB:', err);
    return [];
  }
}

export async function addRecentProject(project: Omit<RecentProject, 'id' | 'timestamp'>): Promise<void> {
  try {
    const list = (await get<RecentProject[]>(RECENTS_KEY)) || [];
    const newEntry: RecentProject = {
      ...project,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    // Keep top 20
    const updated = [newEntry, ...list.filter(p => p.name !== project.name)].slice(0, 20);
    await set(RECENTS_KEY, updated);
  } catch (err) {
    console.warn('Failed to add recent project:', err);
  }
}

export async function deleteRecentProject(id: string): Promise<void> {
  try {
    const list = (await get<RecentProject[]>(RECENTS_KEY)) || [];
    const updated = list.filter(p => p.id !== id);
    await set(RECENTS_KEY, updated);
  } catch (err) {
    console.warn('Failed to delete recent project:', err);
  }
}

export async function clearAllLocalData(): Promise<void> {
  try {
    await clear();
    localStorage.clear();
    sessionStorage.clear();
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to persist settings:', e);
  }
}
