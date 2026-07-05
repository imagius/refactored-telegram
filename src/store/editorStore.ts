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

// Sub-factory group (outpost)
export interface PlacedGroup {
  id: string;
  name: string;
  color: string;
  machineIds: string[];      // machines in this group
  collapsed: boolean;
  // Cached bounds (computed from member positions)
  x: number;
  y: number;
  width: number;
  height: number;
}

// Beacon node
export interface PlacedBeacon {
  id: string;
  beaconId: string;       // Factorio item id (e.g., 'beacon')
  x: number;
  y: number;
  moduleId?: string;      // module inside the beacon
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
  beacons: PlacedBeacon[];
  groups: PlacedGroup[];
  selectedId: string | null;
  selectedIds: string[];            // multi-select
  selectedConnectionId: string | null;
  pendingMachineId: string | null;
  pendingBeaconId: string | null;
  pendingConnection: PendingConnection | null;
  pendingSplitterType: 'splitter' | 'merger' | null;
  gridSnap: boolean;
  gridSize: number;

  // Actions
  loadData: (version?: DatasetVersion) => Promise<void>;
  setDataVersion: (version: DatasetVersion) => void;

  addMachine: (machineId: string, x: number, y: number) => void;
  removeMachine: (id: string) => void;
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

  addBeacon: (beaconId: string, x: number, y: number) => void;
  removeBeacon: (id: string) => void;
  moveBeacon: (id: string, x: number, y: number) => void;
  setBeaconModule: (id: string, moduleId: string | undefined) => void;

  toggleGridSnap: () => void;

  // Groups
  createGroup: (name: string, machineIds: string[]) => void;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  toggleGroupCollapse: (id: string) => void;
  recalcGroupBounds: (id: string) => void;

  setPendingMachine: (machineId: string | null) => void;
  setPendingBeacon: (beaconId: string | null) => void;
  clearCanvas: () => void;
  loadFactoryState: (state: FactoryState) => void;

  // Multi-select
  selectMachine: (id: string | null, additive?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
  removeSelected: () => void;

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
let groupCounter = 0;

const GROUP_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export const useEditorStore = create<EditorState>((set, get) => ({
  data: null,
  dataVersion: '2.0',
  dataLoading: false,
  dataError: null,

  machines: [],
  connections: [],
  splitters: [],
  beacons: [],
  groups: [],
  selectedId: null,
  selectedIds: [],
  selectedConnectionId: null,
  pendingMachineId: null,
  pendingBeaconId: null,
  pendingConnection: null,
  pendingSplitterType: null,
  gridSnap: false,
  gridSize: 10,

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

  selectMachine: (id, additive = false) => {
    if (id === null) {
      set({ selectedId: null, selectedIds: [], selectedConnectionId: null });
      return;
    }
    if (additive) {
      set((state) => {
        const ids = state.selectedIds.includes(id)
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id];
        return { selectedId: id, selectedIds: ids, selectedConnectionId: null };
      });
    } else {
      set({ selectedId: id, selectedIds: [id], selectedConnectionId: null });
    }
  },

  selectMultiple: (ids) => set({ selectedIds: ids, selectedId: ids[0] ?? null, selectedConnectionId: null }),

  clearSelection: () => set({ selectedId: null, selectedIds: [], selectedConnectionId: null }),

  removeSelected: () => {
    set((state) => {
      const ids = state.selectedIds.length > 0 ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
      return {
        machines: state.machines.filter((m) => !ids.includes(m.id)),
        connections: state.connections.filter((c) => !ids.includes(c.fromMachineId) && !ids.includes(c.toMachineId)),
        splitters: state.splitters.filter((s) => !ids.includes(s.id)),
        beacons: state.beacons.filter((b) => !ids.includes(b.id)),
        selectedId: null,
        selectedIds: [],
        selectedConnectionId: null,
      };
    });
  },

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

  setPendingBeacon: (beaconId) => set({ pendingBeaconId: beaconId, pendingMachineId: null, pendingSplitterType: null }),

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

  addBeacon: (beaconId, x, y) => {
    const id = `beacon-${++splitterCounter}`;
    const beacon: PlacedBeacon = { id, beaconId, x, y };
    set((state) => ({
      beacons: [...state.beacons, beacon],
      selectedId: id,
      selectedIds: [id],
      pendingMachineId: null,
    }));
  },

  removeBeacon: (id) => {
    set((state) => ({
      beacons: state.beacons.filter((b) => b.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    }));
  },

  moveBeacon: (id, x, y) => {
    set((state) => ({
      beacons: state.beacons.map((b) => b.id === id ? { ...b, x, y } : b),
    }));
  },

  setBeaconModule: (id, moduleId) => {
    set((state) => ({
      beacons: state.beacons.map((b) => b.id === id ? { ...b, moduleId } : b),
    }));
  },

  toggleGridSnap: () => set((state) => ({ gridSnap: !state.gridSnap })),

  createGroup: (name, machineIds) => {
    const id = `group-${++groupCounter}`;
    const machines = get().machines.filter((m) => machineIds.includes(m.id));
    if (machines.length === 0) return;

    const minX = Math.min(...machines.map((m) => m.x));
    const minY = Math.min(...machines.map((m) => m.y));
    const maxX = Math.max(...machines.map((m) => m.x + 60));  // MACHINE_SIZE
    const maxY = Math.max(...machines.map((m) => m.y + 60));

    const group: PlacedGroup = {
      id, name, machineIds,
      color: GROUP_COLORS[groupCounter % GROUP_COLORS.length],
      collapsed: false,
      x: minX - 10,
      y: minY - 10,
      width: maxX - minX + 20,
      height: maxY - minY + 20,
    };
    set((state) => ({ groups: [...state.groups, group] }));
  },

  removeGroup: (id) => {
    set((state) => ({ groups: state.groups.filter((g) => g.id !== id) }));
  },

  renameGroup: (id, name) => {
    set((state) => ({
      groups: state.groups.map((g) => g.id === id ? { ...g, name } : g),
    }));
  },

  toggleGroupCollapse: (id) => {
    set((state) => ({
      groups: state.groups.map((g) => g.id === id ? { ...g, collapsed: !g.collapsed } : g),
    }));
  },

  recalcGroupBounds: (id) => {
    const group = get().groups.find((g) => g.id === id);
    if (!group) return;
    const machines = get().machines.filter((m) => group.machineIds.includes(m.id));
    if (machines.length === 0) return;

    const minX = Math.min(...machines.map((m) => m.x));
    const minY = Math.min(...machines.map((m) => m.y));
    const maxX = Math.max(...machines.map((m) => m.x + 60));
    const maxY = Math.max(...machines.map((m) => m.y + 60));

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === id ? { ...g, x: minX - 10, y: minY - 10, width: maxX - minX + 20, height: maxY - minY + 20 } : g
      ),
    }));
  },

  clearCanvas: () => set({ machines: [], connections: [], splitters: [], beacons: [], groups: [], selectedId: null, selectedIds: [], selectedConnectionId: null, pendingConnection: null, pendingSplitterType: null, pendingBeaconId: null }),

  loadFactoryState: (state) => {
    set({
      machines: state.machines,
      connections: state.connections,
      splitters: state.splitters ?? [],
      beacons: state.beacons ?? [],
      groups: state.groups ?? [],
      selectedId: null,
      selectedIds: [],
      selectedConnectionId: null,
      pendingConnection: null,
      pendingMachineId: null,
      pendingBeaconId: null,
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