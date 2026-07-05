// Connection types for belts and pipes between machines

export type ConnectionType = 'belt' | 'pipe';
export type ConnectionSide = 'top' | 'right' | 'bottom' | 'left';

export interface Connection {
  id: string;
  type: ConnectionType;
  fromMachineId: string;
  fromSide: ConnectionSide;
  toMachineId: string;
  toSide: ConnectionSide;
  beltId?: string;   // item id of belt tier (e.g., 'transport-belt')
  pipeId?: string;   // item id of pipe type
}

// Port positions relative to machine center (in canvas coordinates)
// Machine is MACHINE_SIZE x MACHINE_SIZE, ports are at the edges
export const PORT_OFFSETS: Record<ConnectionSide, { x: number; y: number }> = {
  top: { x: 0, y: -30 },      // top-center
  right: { x: 30, y: 0 },     // right-center
  bottom: { x: 0, y: 30 },    // bottom-center
  left: { x: -30, y: 0 },     // left-center
};

// Output ports are green, input ports are red
export const PORT_COLORS = {
  output: '#4ade80',
  input: '#f87171',
};

// Get absolute port position given a machine's canvas position
export function getPortPosition(
  machineX: number,
  machineY: number,
  side: ConnectionSide
): { x: number; y: number } {
  const offset = PORT_OFFSETS[side];
  return { x: machineX + offset.x, y: machineY + offset.y };
}

// Splitter node types (for Phase 4)
export interface SplitterNode {
  id: string;
  x: number;
  y: number;
  type: 'splitter' | 'merger';
  beltId?: string;
  priorityOutput?: number;  // index of priority output (0 or 1)
  filterItem?: string;       // for filter splitters
}