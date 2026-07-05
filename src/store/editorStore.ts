import { create } from 'zustand';
import type { FactorioData, Item, Recipe } from '../data/types';
import { loadData, type DatasetVersion } from '../data/loader';

export interface PlacedMachine {
  id: string;              // unique instance id
  machineId: string;       // Factorio item id (e.g., 'assembling-machine-1')
  recipeId?: string;       // selected recipe id
  x: number;
  y: number;
  rotation: number;        // 0, 90, 180, 270
  modules?: string[];      // module ids in slots
}

interface EditorState {
  // Data
  data: FactorioData | null;
  dataVersion: DatasetVersion;
  dataLoading: boolean;
  dataError: string | null;

  // Canvas entities
  machines: PlacedMachine[];
  selectedId: string | null;
  pendingMachineId: string | null;  // machine waiting to be placed

  // Actions
  loadData: (version?: DatasetVersion) => Promise<void>;
  setDataVersion: (version: DatasetVersion) => void;

  addMachine: (machineId: string, x: number, y: number) => void;
  removeMachine: (id: string) => void;
  selectMachine: (id: string | null) => void;
  moveMachine: (id: string, x: number, y: number) => void;
  rotateMachine: (id: string) => void;
  setRecipe: (machineId: string, recipeId: string | undefined) => void;
  setModules: (machineId: string, modules: string[]) => void;

  setPendingMachine: (machineId: string | null) => void;
  clearCanvas: () => void;

  // Helpers
  getMachine: (id: string) => PlacedMachine | undefined;
  getMachineItem: (machineId: string) => Item | undefined;
  getRecipe: (recipeId: string) => Recipe | undefined;
  getRecipesForMachine: (machineId: string) => Recipe[];
}

let machineCounter = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
  data: null,
  dataVersion: '2.0',
  dataLoading: false,
  dataError: null,

  machines: [],
  selectedId: null,
  pendingMachineId: null,

  loadData: async (version) => {
    const v = version ?? get().dataVersion;
    set({ dataLoading: true, dataError: null });
    try {
      const data = await loadData(v);
      set({ data, dataLoading: false, dataVersion: v });
    } catch (err) {
      set({ dataError: String(err), dataLoading: false });
    }
  },

  setDataVersion: (version) => {
    set({ dataVersion: version });
    get().loadData(version);
  },

  addMachine: (machineId, x, y) => {
    const id = `machine-${++machineCounter}`;
    const machine: PlacedMachine = {
      id,
      machineId,
      x,
      y,
      rotation: 0,
    };
    set((state) => ({
      machines: [...state.machines, machine],
      selectedId: id,
      pendingMachineId: null,
    }));
  },

  removeMachine: (id) => {
    set((state) => ({
      machines: state.machines.filter((m) => m.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  selectMachine: (id) => set({ selectedId: id }),

  moveMachine: (id, x, y) => {
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === id ? { ...m, x, y } : m
      ),
    }));
  },

  rotateMachine: (id) => {
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === id ? { ...m, rotation: (m.rotation + 90) % 360 } : m
      ),
    }));
  },

  setRecipe: (machineId, recipeId) => {
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId ? { ...m, recipeId } : m
      ),
    }));
  },

  setModules: (machineId, modules) => {
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId ? { ...m, modules } : m
      ),
    }));
  },

  setPendingMachine: (machineId) => set({ pendingMachineId: machineId }),

  clearCanvas: () => set({ machines: [], selectedId: null }),

  getMachine: (id) => get().machines.find((m) => m.id === id),

  getMachineItem: (machineId) => {
    const data = get().data;
    if (!data) return undefined;
    return data.items.find((item) => item.id === machineId);
  },

  getRecipe: (recipeId) => {
    const data = get().data;
    if (!data) return undefined;
    return data.recipes.find((r) => r.id === recipeId);
  },

  getRecipesForMachine: (machineId) => {
    const data = get().data;
    if (!data) return [];
    return data.recipes.filter((r) => r.producers?.includes(machineId));
  },
}));

// Debug: expose store on window
if (typeof window !== 'undefined') {
  (window as unknown as { __store__: typeof useEditorStore }).__store__ = useEditorStore;
}