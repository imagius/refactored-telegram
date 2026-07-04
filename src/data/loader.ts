import type { FactorioData } from './types';

export type DatasetVersion = '2.0' | 'space-age';

export async function loadData(version: DatasetVersion = '2.0'): Promise<FactorioData> {
  const response = await fetch(`/data/${version}/data.json`);
  if (!response.ok) {
    throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<FactorioData>;
}

export async function loadDefaults(version: DatasetVersion = '2.0'): Promise<Record<string, unknown>> {
  const response = await fetch(`/data/${version}/defaults.json`);
  if (!response.ok) {
    throw new Error(`Failed to load defaults: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/** Parse an inserter speed string like "2160/7" into a number */
export function parseInserterSpeed(speed: string): number {
  if (speed.includes('/')) {
    const [num, den] = speed.split('/').map(Number);
    return num / den;
  }
  return Number(speed);
}

/** Get the icon URL for a dataset version */
export function getIconsPath(version: DatasetVersion = '2.0'): string {
  return `/data/${version}/icons.webp`;
}