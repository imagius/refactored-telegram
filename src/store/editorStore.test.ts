import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';
import type { FactorioData } from '../data/types';

// Minimal mock data for testing
const mockData: FactorioData = {
  version: { base: '2.0' },
  categories: [],
  icons: [],
  items: [
    { id: 'assembling-machine-1', name: 'Assembling Machine 1', category: 'machine', machine: { speed: 0.5, usage: 25, modules: 0 } },
    { id: 'assembling-machine-2', name: 'Assembling Machine 2', category: 'machine', machine: { speed: 0.75, usage: 75, modules: 2 } },
    { id: 'transport-belt', name: 'Transport Belt', category: 'logistics', belt: { speed: 15 } },
    { id: 'speed-module', name: 'Speed Module', category: 'module', module: { speed: 0.2 } },
  ],
  recipes: [
    { id: 'iron-plate', name: 'Iron Plate', category: 'smelting', time: 3.2, in: { 'iron-ore': 1 }, out: { 'iron-plate': 1 }, producers: ['assembling-machine-1', 'assembling-machine-2'] },
  ],
  flags: [],
  locations: [],
  defaults: { belt: 'transport-belt' },
};

// Reset store before each test
beforeEach(() => {
  useEditorStore.setState({
    data: mockData,
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
    gridSnap: false,
    gridSize: 10,
  });
});

describe('editorStore - machine operations', () => {
  it('addMachine creates a machine with correct defaults', () => {
    const { addMachine } = useEditorStore.getState();
    addMachine('assembling-machine-1', 100, 200);

    const state = useEditorStore.getState();
    expect(state.machines).toHaveLength(1);
    expect(state.machines[0].machineId).toBe('assembling-machine-1');
    expect(state.machines[0].x).toBe(100);
    expect(state.machines[0].y).toBe(200);
    expect(state.machines[0].rotation).toBe(0);
    expect(state.machines[0].recipeId).toBeUndefined();
    expect(state.selectedId).toBe(state.machines[0].id);
    expect(state.pendingMachineId).toBeNull();
  });

  it('addMachine generates unique IDs', () => {
    const { addMachine } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    addMachine('assembling-machine-2', 100, 0);

    const state = useEditorStore.getState();
    expect(state.machines).toHaveLength(2);
    expect(state.machines[0].id).not.toBe(state.machines[1].id);
  });

  it('removeMachine deletes the machine and its connections', () => {
    const { addMachine, addConnection, removeMachine } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    addMachine('assembling-machine-2', 100, 0);
    const m1 = useEditorStore.getState().machines[0];
    const m2 = useEditorStore.getState().machines[1];

    addConnection(m1.id, 'right', m2.id, 'left', 'belt');
    expect(useEditorStore.getState().connections).toHaveLength(1);

    removeMachine(m1.id);
    const state = useEditorStore.getState();
    expect(state.machines).toHaveLength(1);
    expect(state.connections).toHaveLength(0);
    expect(state.machines[0].id).toBe(m2.id);
  });

  it('moveMachine updates position', () => {
    const { addMachine, moveMachine } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    const m = useEditorStore.getState().machines[0];

    moveMachine(m.id, 200, 300);
    const updated = useEditorStore.getState().machines[0];
    expect(updated.x).toBe(200);
    expect(updated.y).toBe(300);
  });

  it('rotateMachine cycles through 0→90→180→270→0', () => {
    const { addMachine, rotateMachine } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    const m = useEditorStore.getState().machines[0];

    rotateMachine(m.id);
    expect(useEditorStore.getState().machines[0].rotation).toBe(90);
    rotateMachine(m.id);
    expect(useEditorStore.getState().machines[0].rotation).toBe(180);
    rotateMachine(m.id);
    expect(useEditorStore.getState().machines[0].rotation).toBe(270);
    rotateMachine(m.id);
    expect(useEditorStore.getState().machines[0].rotation).toBe(0);
  });

  it('setRecipe assigns a recipe to a machine', () => {
    const { addMachine, setRecipe } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    const m = useEditorStore.getState().machines[0];

    setRecipe(m.id, 'iron-plate');
    expect(useEditorStore.getState().machines[0].recipeId).toBe('iron-plate');
  });

  it('setRecipe can clear a recipe with undefined', () => {
    const { addMachine, setRecipe } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    const m = useEditorStore.getState().machines[0];

    setRecipe(m.id, 'iron-plate');
    setRecipe(m.id, undefined);
    expect(useEditorStore.getState().machines[0].recipeId).toBeUndefined();
  });

  it('setModules assigns modules to a machine', () => {
    const { addMachine, setModules } = useEditorStore.getState();
    addMachine('assembling-machine-2', 0, 0);
    const m = useEditorStore.getState().machines[0];

    setModules(m.id, ['speed-module', 'speed-module']);
    expect(useEditorStore.getState().machines[0].modules).toEqual(['speed-module', 'speed-module']);
  });
});

describe('editorStore - connection operations', () => {
  it('addConnection creates a belt connection with default beltId', () => {
    const { addMachine, addConnection } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    addMachine('assembling-machine-2', 100, 0);
    const m1 = useEditorStore.getState().machines[0];
    const m2 = useEditorStore.getState().machines[1];

    addConnection(m1.id, 'right', m2.id, 'left', 'belt');
    const conn = useEditorStore.getState().connections[0];
    expect(conn.type).toBe('belt');
    expect(conn.fromMachineId).toBe(m1.id);
    expect(conn.toMachineId).toBe(m2.id);
    expect(conn.fromSide).toBe('right');
    expect(conn.toSide).toBe('left');
    expect(conn.beltId).toBe('transport-belt');
    expect(useEditorStore.getState().pendingConnection).toBeNull();
    expect(useEditorStore.getState().selectedConnectionId).toBe(conn.id);
  });

  it('removeConnection deletes a connection', () => {
    const { addMachine, addConnection, removeConnection } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    addMachine('assembling-machine-2', 100, 0);
    const m1 = useEditorStore.getState().machines[0];
    const m2 = useEditorStore.getState().machines[1];

    addConnection(m1.id, 'right', m2.id, 'left', 'belt');
    const connId = useEditorStore.getState().connections[0].id;

    removeConnection(connId);
    expect(useEditorStore.getState().connections).toHaveLength(0);
  });
});

describe('editorStore - splitter operations', () => {
  it('addSplitter creates a splitter with default belt', () => {
    const { addSplitter } = useEditorStore.getState();
    addSplitter('splitter', 100, 200);

    const state = useEditorStore.getState();
    expect(state.splitters).toHaveLength(1);
    expect(state.splitters[0].type).toBe('splitter');
    expect(state.splitters[0].x).toBe(100);
    expect(state.splitters[0].y).toBe(200);
    expect(state.splitters[0].beltId).toBe('transport-belt');
    expect(state.selectedId).toBe(state.splitters[0].id);
  });

  it('addSplitter creates a merger', () => {
    const { addSplitter } = useEditorStore.getState();
    addSplitter('merger', 50, 50);

    expect(useEditorStore.getState().splitters[0].type).toBe('merger');
  });

  it('moveSplitter updates position', () => {
    const { addSplitter, moveSplitter } = useEditorStore.getState();
    addSplitter('splitter', 0, 0);
    const s = useEditorStore.getState().splitters[0];

    moveSplitter(s.id, 300, 400);
    expect(useEditorStore.getState().splitters[0].x).toBe(300);
    expect(useEditorStore.getState().splitters[0].y).toBe(400);
  });

  it('removeSplitter deletes a splitter and its connections', () => {
    const { addSplitter, addMachine, addConnection, removeSplitter } = useEditorStore.getState();
    addSplitter('splitter', 100, 100);
    addMachine('assembling-machine-1', 0, 0);
    const s = useEditorStore.getState().splitters[0];
    const m = useEditorStore.getState().machines[0];

    addConnection(s.id, 'right', m.id, 'left', 'belt');
    expect(useEditorStore.getState().connections).toHaveLength(1);

    removeSplitter(s.id);
    expect(useEditorStore.getState().splitters).toHaveLength(0);
    expect(useEditorStore.getState().connections).toHaveLength(0);
  });

  it('setSplitterPriority updates priority output', () => {
    const { addSplitter, setSplitterPriority } = useEditorStore.getState();
    addSplitter('splitter', 0, 0);
    const s = useEditorStore.getState().splitters[0];

    setSplitterPriority(s.id, 1);
    expect(useEditorStore.getState().splitters[0].priorityOutput).toBe(1);
  });

  it('setSplitterFilter sets item filter', () => {
    const { addSplitter, setSplitterFilter } = useEditorStore.getState();
    addSplitter('splitter', 0, 0);
    const s = useEditorStore.getState().splitters[0];

    setSplitterFilter(s.id, 'iron-plate');
    expect(useEditorStore.getState().splitters[0].filterItem).toBe('iron-plate');
  });
});

describe('editorStore - grid snap', () => {
  it('toggleGridSnap flips the flag', () => {
    expect(useEditorStore.getState().gridSnap).toBe(false);
    useEditorStore.getState().toggleGridSnap();
    expect(useEditorStore.getState().gridSnap).toBe(true);
    useEditorStore.getState().toggleGridSnap();
    expect(useEditorStore.getState().gridSnap).toBe(false);
  });
});

describe('editorStore - clearCanvas', () => {
  it('clearCanvas removes all machines, connections, splitters, and clears selection', () => {
    const { addMachine, addConnection, addSplitter, clearCanvas } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    addMachine('assembling-machine-2', 100, 0);
    addSplitter('splitter', 50, 50);
    const m1 = useEditorStore.getState().machines[0];
    const m2 = useEditorStore.getState().machines[1];
    addConnection(m1.id, 'right', m2.id, 'left', 'belt');

    clearCanvas();
    const state = useEditorStore.getState();
    expect(state.machines).toHaveLength(0);
    expect(state.connections).toHaveLength(0);
    expect(state.splitters).toHaveLength(0);
    expect(state.selectedId).toBeNull();
    expect(state.selectedConnectionId).toBeNull();
    expect(state.pendingConnection).toBeNull();
    expect(state.pendingSplitterType).toBeNull();
  });
});

describe('editorStore - loadFactoryState', () => {
  it('loadFactoryState replaces all canvas entities', () => {
    const { loadFactoryState } = useEditorStore.getState();
    const machines = [
      { id: 'm-import-1', machineId: 'assembling-machine-1', x: 50, y: 50, rotation: 90 },
    ];
    const connections = [
      { id: 'c-import-1', type: 'belt' as const, fromMachineId: 'm-import-1', fromSide: 'right' as const, toMachineId: 'm-import-2', toSide: 'left' as const },
    ];

    loadFactoryState({
      version: 1,
      dataVersion: '2.0',
      machines,
      connections,
      splitters: [],
      savedAt: new Date().toISOString(),
    });

    const state = useEditorStore.getState();
    expect(state.machines).toEqual(machines);
    expect(state.connections).toEqual(connections);
    expect(state.selectedId).toBeNull();
  });
});

describe('editorStore - helper methods', () => {
  it('getMachine returns the correct machine', () => {
    const { addMachine } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    const m = useEditorStore.getState().machines[0];

    const found = useEditorStore.getState().getMachine(m.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(m.id);
  });

  it('getMachineItem returns the correct item from data', () => {
    const item = useEditorStore.getState().getMachineItem('assembling-machine-1');
    expect(item).toBeDefined();
    expect(item?.name).toBe('Assembling Machine 1');
  });

  it('getRecipe returns the correct recipe', () => {
    const recipe = useEditorStore.getState().getRecipe('iron-plate');
    expect(recipe).toBeDefined();
    expect(recipe?.name).toBe('Iron Plate');
  });

  it('getRecipesForMachine returns recipes a machine can produce', () => {
    const recipes = useEditorStore.getState().getRecipesForMachine('assembling-machine-1');
    expect(recipes).toHaveLength(1);
    expect(recipes[0].id).toBe('iron-plate');
  });

  it('getConnectionsForMachine returns all connections for a machine', () => {
    const { addMachine, addConnection } = useEditorStore.getState();
    addMachine('assembling-machine-1', 0, 0);
    addMachine('assembling-machine-2', 100, 0);
    const m1 = useEditorStore.getState().machines[0];
    const m2 = useEditorStore.getState().machines[1];
    addConnection(m1.id, 'right', m2.id, 'left', 'belt');

    const conns = useEditorStore.getState().getConnectionsForMachine(m1.id);
    expect(conns).toHaveLength(1);
  });
});