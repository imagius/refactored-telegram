// Persistence: auto-save to localStorage, export/import as JSON files

import type { PlacedMachine, PlacedSplitter } from '../store/editorStore';
import type { Connection } from '../types/connections';
import type { DatasetVersion } from '../data/loader';

export interface FactoryState {
  version: 1;              // schema version for future migrations
  dataVersion: DatasetVersion;
  machines: PlacedMachine[];
  connections: Connection[];
  splitters: PlacedSplitter[];
  savedAt: string;         // ISO timestamp
  name?: string;
}

const STORAGE_KEY = 'factorio-modeler-autosave';
const SLOTS_KEY = 'factorio-modeler-slots';

/** Auto-save current factory state to localStorage */
export function autoSave(state: Omit<FactoryState, 'version' | 'savedAt'>): void {
  try {
    const full: FactoryState = {
      ...state,
      version: 1,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch (e) {
    console.warn('Auto-save failed:', e);
  }
}

/** Load auto-saved factory state from localStorage */
export function loadAutoSave(): FactoryState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as FactoryState;
    if (data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

/** Save factory to a named slot */
export function saveToSlot(name: string, state: Omit<FactoryState, 'version' | 'savedAt' | 'name'>): void {
  try {
    const slots = getSlots();
    const full: FactoryState = {
      ...state,
      version: 1,
      savedAt: new Date().toISOString(),
      name,
    };
    slots[name] = full;
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch (e) {
    console.warn('Save to slot failed:', e);
  }
}

/** Load factory from a named slot */
export function loadFromSlot(name: string): FactoryState | null {
  const slots = getSlots();
  return slots[name] ?? null;
}

/** Get all saved slots */
export function getSlots(): Record<string, FactoryState> {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, FactoryState>;
  } catch {
    return {};
  }
}

/** Delete a named slot */
export function deleteSlot(name: string): void {
  const slots = getSlots();
  delete slots[name];
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

/** Export factory state as a downloadable JSON file */
export function exportFactory(state: Omit<FactoryState, 'version' | 'savedAt'>, filename: string = 'factory.json'): void {
  const full: FactoryState = {
    ...state,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import factory state from a JSON file (returns parsed state or null on error) */
export function importFactory(file: File): Promise<FactoryState | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as FactoryState;
        if (data.version !== 1) {
          console.error('Unsupported factory file version:', data.version);
          resolve(null);
          return;
        }
        resolve(data);
      } catch (e) {
        console.error('Import failed:', e);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}