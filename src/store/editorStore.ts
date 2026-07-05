import { create } from 'zustand';
import type { FactorioData, Item, Recipe } from '../data/types';
import { loadData, type DatasetVersion } from '../data/loader';
import type { Connection, ConnectionType, ConnectionSide } from '../types/connections';
import type { FactoryState } from './persistence';

export interface PlacedMachine {
  id: string;              // unique instance id
  machineId: string;       // Factorio item id (e.g., 'assembling-machine-1')
  recipeId?: string;       // selected recipe id
  x: number;
  y: number;
  rotation: number;        // 0, 90, 180, 270
  modules?: string[];      // module ids in slots
}

// Pending connection state (user clicked an output port, waiting to click input port)
export interface PendingConnection {
  fromMachineId: string;
  fromSide: ConnectionSide;
}

// Splitter/merger node
export interface PlacedSplitter {
  id: string;
  type: 'splitter' | 'merger';
  x: number;
  y: number;
  rotation: number;
  beltId?: string;
  priorityOutput?: number;  // 0 or 1 (for splitters)
  filterItem?: string;       // item id for filter splitters
}

interface EditorState {
  // Data
  data: FactorioData | null;
  dataVersion: DatasetVersion;
  dataLoading: boolean;
  dataError: string | null;

  // Canvas entities
  machines: PlacedMachine[];
  connections: Connection[];
  splitters: PlacedSplitter[];
  selectedId: string | null;
  selectedConnectionId: string | null;
  pendingMachineId: string | null;
  pendingConnection: PendingConnection | null;
  pendingSplitterType: 'splitter' | 'merger' | null;

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

  addConnection: (fromMachineId: string, fromSide: ConnectionSide, toMachineId: string, toSide: ConnectionSide, type: ConnectionType) => void;
  removeConnection: (id: string) => void;
  selectConnection: (id: string | null) => void;
  setPendingConnection: (conn: PendingConnection | null) => void;

  addSplitter: (type: 'splitter' | 'merger', x: number, y: number) => void;
  removeSplitter: (id: string) => void;
  moveSplitter: (id: string, x: number, y: number) => void;
  setSplitterPriority: (id: string, output: number) => void;
  setSplitterFilter: (id: string, itemId: string | undefined) => void;
  setPendingSplitter: (type: 'splitter' | 'merger' | null) => void;

  setPendingMachine: (machineId: string | null) => void;
  clearCanvas: () => void;
  loadFactoryState: (state: FactoryState) => void;

  // Helpers
  getMachine: (id: string) => PlacedMachine | undefined;
  getMachineItem: (machineId: string) => Item | undefined;
  getRecipe: (recipeId: string) => Recipe | undefined;
  getRecipesForMachine: (machineId: string) => Recipe[];
  getConnectionsForMachine: (machineId: string) => Connection[];
}

let machineCounter = 0;
let connectionCounter = 0;
let splitterCounter = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
  data: null,
  dataVersion: '2.0',
  dataLoading: false,
  dataError: null,

  machines: [],
  connections: [],
  splitters: [],
  selectedId: null,
  selectedConnectionId: null,
  pendingMachineId: null,
  pendingConnection: null,
  pendingSplitterType: null,

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
      connections: state.connections.filter((c) => c.fromMachineId !== id && c.toMachineId !== id),
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

  addConnection: (fromMachineId, fromSide, toMachineId, toSide, type) => {
    const id = `conn-${++connectionCounter}`;
    const conn: Connection = {
      id, type, fromMachineId, fromSide, toMachineId, toSide,
      beltId: type === 'belt' ? get().data?.defaults.belt : undefined,
    };
    set((state) => ({
      connections: [...state.connections, conn],
      pendingConnection: null,
      selectedConnectionId: id,
    }));
  },

  removeConnection: (id) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
    }));
  },

  selectConnection: (id) => set({ selectedConnectionId: id, selectedId: null }),

  setPendingConnection: (conn) => set({ pendingConnection: conn }),

  addSplitter: (type, x, y) => {
    const id = `splitter-${++splitterCounter}`;
    const splitter: PlacedSplitter = {
      id, type, x, y, rotation: 0,
      beltId: get().data?.defaults.belt,
      priorityOutput: undefined,
    };
    set((state) => ({
      splitters: [...state.splitters, splitter],
      selectedId: id,
      pendingSplitterType: null,
    }));
  },

  removeSplitter: (id) => {
    set((state) => ({
      splitters: state.splitters.filter((s) => s.id !== id),
      connections: state.connections.filter((c) => c.fromMachineId !== id && c.toMachineId !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  moveSplitter: (id, x, y) => {
    set((state) => ({
      splitters: state.splitters.map((s) => s.id === id ? { ...s, x, y } : s),
    }));
  },

  setSplitterPriority: (id, output) => {
    set((state) => ({
      splitters: state.splitters.map((s) => s.id === id ? { ...s, priorityOutput: output } : s),
    }));
  },

  setSplitterFilter: (id, itemId) => {
    set((state) => ({
      splitters: state.splitters.map((s) => s.id === id ? { ...s, filterItem: itemId } : s),
    }));
  },

  setPendingSplitter: (type) => set({ pendingSplitterType: type }),

  clearCanvas: () => set({ machines: [], connections: [], splitters: [], selectedId: null, selectedConnectionId: null, pendingConnection: null, pendingSplitterType: null }),

  loadFactoryState: (state) => {
    set({
      machines: state.machines,
      connections: state.connections,
      splitters: state.splitters ?? [],
      selectedId: null,
      selectedConnectionId: null,
      pendingConnection: null,
      pendingMachineId: null,
      pendingSplitterType: null,
    });
    if (state.dataVersion && state.dataVersion !== get().dataVersion) {
      get().loadData(state.dataVersion);
    }
  },

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

  getConnectionsForMachine: (machineId) => {
    return get().connections.filter((c) => c.fromMachineId === machineId || c.toMachineId === machineId);
  },
}));

// Debug: expose store on window
if (typeof window !== 'undefined') {
  (window as unknown as { __store__: typeof useEditorStore }).__store__ = useEditorStore;
}