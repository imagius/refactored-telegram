import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  autoSave,
  loadAutoSave,
  saveToSlot,
  loadFromSlot,
  getSlots,
  deleteSlot,
  exportFactory,
  type FactoryState,
} from './persistence';

// Mock localStorage
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  // Clear mock storage
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];

  // Mock localStorage
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { for (const key of Object.keys(mockStorage)) delete mockStorage[key]; },
    key: (index: number) => Object.keys(mockStorage)[index] ?? null,
    get length() { return Object.keys(mockStorage).length; },
  });
});

const factoryState: Omit<FactoryState, 'version' | 'savedAt'> = {
  dataVersion: '2.0',
  machines: [
    { id: 'm1', machineId: 'assembling-machine-1', x: 100, y: 200, rotation: 0 },
  ],
  connections: [],
  splitters: [],
};

describe('persistence - autoSave/loadAutoSave', () => {
  it('autoSave writes to localStorage', () => {
    autoSave(factoryState);
    const raw = mockStorage['factorio-modeler-autosave'];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.machines).toHaveLength(1);
    expect(parsed.dataVersion).toBe('2.0');
    expect(parsed.savedAt).toBeDefined();
  });

  it('loadAutoSave returns the saved state', () => {
    autoSave(factoryState);
    const loaded = loadAutoSave();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(1);
    expect(loaded?.machines).toHaveLength(1);
    expect(loaded?.machines[0].machineId).toBe('assembling-machine-1');
  });

  it('loadAutoSave returns null when nothing saved', () => {
    expect(loadAutoSave()).toBeNull();
  });

  it('loadAutoSave returns null for wrong version', () => {
    mockStorage['factorio-modeler-autosave'] = JSON.stringify({ version: 999, machines: [] });
    expect(loadAutoSave()).toBeNull();
  });

  it('autoSave handles errors gracefully', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('Quota exceeded'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    // Should not throw
    expect(() => autoSave(factoryState)).not.toThrow();
  });
});

describe('persistence - save slots', () => {
  it('saveToSlot writes a named slot', () => {
    saveToSlot('My Factory', factoryState);
    const slots = getSlots();
    expect(slots['My Factory']).toBeDefined();
    expect(slots['My Factory'].machines).toHaveLength(1);
    expect(slots['My Factory'].name).toBe('My Factory');
  });

  it('loadFromSlot returns the saved state', () => {
    saveToSlot('My Factory', factoryState);
    const loaded = loadFromSlot('My Factory');
    expect(loaded).not.toBeNull();
    expect(loaded?.machines[0].machineId).toBe('assembling-machine-1');
  });

  it('loadFromSlot returns null for non-existent slot', () => {
    expect(loadFromSlot('Non-existent')).toBeNull();
  });

  it('getSlots returns empty object when nothing saved', () => {
    expect(getSlots()).toEqual({});
  });

  it('deleteSlot removes a named slot', () => {
    saveToSlot('A', factoryState);
    saveToSlot('B', factoryState);
    deleteSlot('A');
    const slots = getSlots();
    expect(slots['A']).toBeUndefined();
    expect(slots['B']).toBeDefined();
  });

  it('saveToSlot overwrites existing slot with same name', () => {
    saveToSlot('My Factory', factoryState);
    const updated = { ...factoryState, machines: [...factoryState.machines, { id: 'm2', machineId: 'assembling-machine-2', x: 200, y: 300, rotation: 90 }] };
    saveToSlot('My Factory', updated);
    const loaded = loadFromSlot('My Factory');
    expect(loaded?.machines).toHaveLength(2);
  });
});

describe('persistence - export', () => {
  it('exportFactory creates a download link and revokes it', () => {
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:test-url');
    const revokeObjectURLSpy = vi.fn();
    const clickSpy = vi.fn();

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });

    // Mock document.createElement
    const originalCreate = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const el = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
        return el;
      }
      return originalCreate.call(document, tagName);
    });

    exportFactory(factoryState, 'test-factory.json');

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');

    vi.restoreAllMocks();
  });
});