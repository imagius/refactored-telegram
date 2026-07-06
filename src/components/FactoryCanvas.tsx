import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Arrow, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { useEditorStore, type PlacedMachine, type PlacedSplitter, type PlacedGroup } from '../store/editorStore';
import { getPortPosition, type ConnectionSide } from '../types/connections';
import { useFlowSolver } from '../hooks/useFlowSolver';
import { useIconImage } from '../hooks/useImage';
import { titleCaseName } from '../utils/titleCase';

const MACHINE_SIZE = 60;
const PORT_RADIUS = 5;

const SIDES: ConnectionSide[] = ['top', 'right', 'bottom', 'left'];

// Port offsets relative to machine top-left (machine is rendered at x,y as top-left of group)
const SIDE_OFFSETS: Record<ConnectionSide, { x: number; y: number }> = {
  top: { x: MACHINE_SIZE / 2, y: 0 },
  right: { x: MACHINE_SIZE, y: MACHINE_SIZE / 2 },
  bottom: { x: MACHINE_SIZE / 2, y: MACHINE_SIZE },
  left: { x: 0, y: MACHINE_SIZE / 2 },
};

function MachinePorts({ machine }: { machine: PlacedMachine }) {
  const pendingConnection = useEditorStore((s) => s.pendingConnection);
  const setPendingConnection = useEditorStore((s) => s.setPendingConnection);
  const addConnection = useEditorStore((s) => s.addConnection);

  const handlePortClick = (side: ConnectionSide, isOutput: boolean, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;

    if (isOutput) {
      // Start a pending connection from this output port
      setPendingConnection({ fromMachineId: machine.id, fromSide: side });
    } else {
      // Input port — if there's a pending connection, complete it
      if (pendingConnection) {
        // Don't allow self-connections
        if (pendingConnection.fromMachineId !== machine.id) {
          addConnection(pendingConnection.fromMachineId, pendingConnection.fromSide, machine.id, side, 'belt');
        }
      }
    }
  };

  return (
    <>
      {SIDES.map((side) => {
        const offset = SIDE_OFFSETS[side];
        // Output ports on top and right; input ports on bottom and left
        const isOutput = side === 'top' || side === 'right';
        const color = isOutput ? '#4ade80' : '#f87171';
        const isActive = pendingConnection?.fromMachineId === machine.id && pendingConnection?.fromSide === side;

        return (
          <Circle
            key={side}
            x={offset.x}
            y={offset.y}
            radius={isActive ? PORT_RADIUS + 2 : PORT_RADIUS}
            fill={color}
            stroke={isActive ? '#fff' : '#333'}
            strokeWidth={isActive ? 2 : 1}
            onClick={(e) => handlePortClick(side, isOutput, e)}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          />
        );
      })}
    </>
  );
}

function MachineNode({ machine, flowResult }: { machine: PlacedMachine; flowResult: ReturnType<typeof useFlowSolver> }) {
  const machineItem = useEditorStore((s) => s.getMachineItem(machine.machineId));
  const recipe = machine.recipeId ? useEditorStore((s) => s.getRecipe(machine.recipeId!)) : undefined;
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectMachine = useEditorStore((s) => s.selectMachine);
  const moveMachine = useEditorStore((s) => s.moveMachine);
  const rotateMachine = useEditorStore((s) => s.rotateMachine);
  const data = useEditorStore((s) => s.data);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  // Look up the icon: prefer recipe icon if recipe is set, otherwise machine's own icon
  const iconId = recipe?.id ?? machine.machineId;
  const icon = data?.icons.find((i) => i.id === iconId);
  const iconsPath = data ? `/data/${dataVersion}/icons.webp` : null;
  const iconImage = useIconImage(iconsPath, icon);

  const isSelected = selectedId === machine.id;
  const isInMultiSelect = selectedIds.includes(machine.id);
  const machineName = machineItem ? titleCaseName(machineItem.name) : machine.machineId;
  const displayName = recipe ? titleCaseName(recipe.name) : machineName;
  const label = displayName.length > 12 ? displayName.substring(0, 10) + '...' : displayName;

  // Flow data for utilization bar
  const machineFlow = flowResult?.machines[machine.id];
  const util = machineFlow?.utilization ?? 0;
  const utilPercent = Math.round(util * 100);
  const utilColor = util < 0.5 ? '#f87171' : util < 0.9 ? '#facc15' : '#4ade80';

  return (
    <Group
      x={machine.x}
      y={machine.y}
      rotation={machine.rotation}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        selectMachine(machine.id, e.evt.shiftKey);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        selectMachine(machine.id, (e.evt as unknown as MouseEvent).shiftKey);
      }}
      onDragEnd={(e) => {
        let x = e.target.x();
        let y = e.target.y();
        const gridSnap = useEditorStore.getState().gridSnap;
        const gridSize = useEditorStore.getState().gridSize;
        if (gridSnap) {
          x = Math.round(x / gridSize) * gridSize;
          y = Math.round(y / gridSize) * gridSize;
        }
        moveMachine(machine.id, x, y);
      }}
    >
      <Rect
        width={MACHINE_SIZE}
        height={MACHINE_SIZE}
        cornerRadius={6}
        fill={isSelected || isInMultiSelect ? '#2a4a6e' : '#1e2a4a'}
        stroke={isSelected ? '#e94560' : isInMultiSelect ? '#60a5fa' : '#3a3a5a'}
        strokeWidth={isSelected || isInMultiSelect ? 2 : 1}
        shadowColor="black"
        shadowBlur={4}
        shadowOffsetY={2}
        shadowOpacity={0.3}
      />
      {iconImage && (
        <KonvaImage
          image={iconImage}
          x={4}
          y={4}
          width={MACHINE_SIZE - 8}
          height={MACHINE_SIZE - 8}
          listening={false}
        />
      )}
      <Text
        text={label}
        fontSize={8}
        fill="#c4c4c4"
        width={MACHINE_SIZE}
        align="center"
        y={MACHINE_SIZE + 2}
        wrap="none"
        ellipsis
        listening={false}
      />
      {isSelected && (
        <Text
          text="R"
          fontSize={12}
          fontStyle="bold"
          fill="#e94560"
          x={MACHINE_SIZE - 14}
          y={-16}
          onClick={(e) => {
            e.cancelBubble = true;
            rotateMachine(machine.id);
          }}
        />
      )}
      {/* Ports */}
      <MachinePorts machine={machine} />

      {/* Utilization bar (below machine) */}
      {recipe && (
        <>
          <Rect
            x={4}
            y={MACHINE_SIZE + 12}
            width={MACHINE_SIZE - 8}
            height={4}
            fill="#333"
            cornerRadius={2}
            listening={false}
          />
          <Rect
            x={4}
            y={MACHINE_SIZE + 12}
            width={Math.max(0, (MACHINE_SIZE - 8) * util)}
            height={4}
            fill={utilColor}
            cornerRadius={2}
            listening={false}
          />
          <Text
            text={`${utilPercent}%`}
            fontSize={8}
            fill={utilColor}
            x={0}
            y={MACHINE_SIZE + 17}
            width={MACHINE_SIZE}
            align="center"
            listening={false}
          />
        </>
      )}
    </Group>
  );
}

function BeltConnection({ connId, flowResult }: { connId: string; flowResult: ReturnType<typeof useFlowSolver> }) {
  const conn = useEditorStore((s) => s.connections.find((c) => c.id === connId));
  const fromMachine = useEditorStore((s) => conn ? s.machines.find((m) => m.id === conn.fromMachineId) : undefined);
  const toMachine = useEditorStore((s) => conn ? s.machines.find((m) => m.id === conn.toMachineId) : undefined);
  const selectedConnectionId = useEditorStore((s) => s.selectedConnectionId);
  const selectConnection = useEditorStore((s) => s.selectConnection);
  const removeConnection = useEditorStore((s) => s.removeConnection);

  if (!conn || !fromMachine || !toMachine) return null;

  const fromPos = getPortPosition(fromMachine.x, fromMachine.y, conn.fromSide);
  const toPos = getPortPosition(toMachine.x, toMachine.y, conn.toSide);
  const isSelected = selectedConnectionId === conn.id;

  // Flow data
  const flow = flowResult?.connections[conn.id];
  const itemsPerSec = flow?.itemsPerSec ?? 0;
  const bottlenecked = flow?.bottlenecked ?? false;
  const capacity = flow?.beltCapacity ?? 15;
  const saturation = capacity > 0 ? itemsPerSec / capacity : 0;

  // Color based on saturation
  const beltColor = bottlenecked ? '#f87171' : saturation > 0.5 ? '#facc15' : '#4ade80';
  const strokeColor = isSelected ? '#e94560' : beltColor;

  // Label position (midpoint)
  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2;
  const label = itemsPerSec > 0 ? `${itemsPerSec.toFixed(1)}/s` : '';

  return (
    <>
      <Arrow
        points={[fromPos.x, fromPos.y, toPos.x, toPos.y]}
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        pointerLength={8}
        pointerWidth={8}
        onClick={(e) => {
          e.cancelBubble = true;
          selectConnection(conn.id);
        }}
        onDblClick={(e) => {
          e.cancelBubble = true;
          removeConnection(conn.id);
        }}
      />
      {label && (
        <Group x={midX} y={midY - 10}>
          <Rect x={-18} y={-7} width={36} height={14} fill="#1a1a2e" opacity={0.8} cornerRadius={3} />
          <Text
            text={label}
            fontSize={10}
            fill={beltColor}
            width={36}
            align="center"
            y={-6}
          />
        </Group>
      )}
    </>
  );
}

const SPLITTER_WIDTH = 60;
const SPLITTER_HEIGHT = 30;

const BEACON_SIZE = 50;

function BeaconNode({ beacon }: { beacon: import('../store/editorStore').PlacedBeacon }) {
  const data = useEditorStore((s) => s.data);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectMachine = useEditorStore((s) => s.selectMachine);
  const moveBeacon = useEditorStore((s) => s.moveBeacon);
  const removeBeacon = useEditorStore((s) => s.removeBeacon);

  const beaconItem = data?.items.find((i) => i.id === beacon.beaconId);
  const beaconProps = beaconItem?.beacon;
  const isSelected = selectedId === beacon.id || selectedIds.includes(beacon.id);
  const range = beaconProps?.range ?? 3;
  // Convert tile range to canvas pixels (machine is 60px = 3 tiles, so 1 tile ≈ 20px)
  const rangePixels = range * 20;
  const moduleName = beacon.moduleId ? data?.items.find((i) => i.id === beacon.moduleId)?.name : undefined;

  return (
    <Group
      x={beacon.x}
      y={beacon.y}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        selectMachine(beacon.id, e.evt.shiftKey);
      }}
      onDragEnd={(e) => {
        let x = e.target.x();
        let y = e.target.y();
        const gridSnap = useEditorStore.getState().gridSnap;
        const gridSize = useEditorStore.getState().gridSize;
        if (gridSnap) {
          x = Math.round(x / gridSize) * gridSize;
          y = Math.round(y / gridSize) * gridSize;
        }
        moveBeacon(beacon.id, x, y);
      }}
    >
      {/* Effect radius circle */}
      <Circle
        x={BEACON_SIZE / 2}
        y={BEACON_SIZE / 2}
        radius={rangePixels}
        fill="rgba(233, 69, 96, 0.05)"
        stroke="rgba(233, 69, 96, 0.3)"
        strokeWidth={1}
        dash={[4, 4]}
        listening={false}
      />
      <Rect
        width={BEACON_SIZE}
        height={BEACON_SIZE}
        cornerRadius={4}
        fill={isSelected ? '#5a2a3e' : '#3a1a2e'}
        stroke={isSelected ? '#e94560' : '#5a3a4a'}
        strokeWidth={isSelected ? 2 : 1}
      />
      <Text
        text="📡"
        fontSize={16}
        width={BEACON_SIZE}
        align="center"
        y={BEACON_SIZE / 2 - 10}
      />
      {moduleName && (
        <Text
          text={moduleName.length > 10 ? moduleName.substring(0, 8) + '...' : moduleName}
          fontSize={7}
          fill="#c4c4c4"
          width={BEACON_SIZE}
          align="center"
          y={BEACON_SIZE - 10}
          listening={false}
        />
      )}
      {isSelected && (
        <Text
          text="✕"
          fontSize={12}
          fill="#f87171"
          x={BEACON_SIZE - 4}
          y={-16}
          onClick={(e) => {
            e.cancelBubble = true;
            removeBeacon(beacon.id);
          }}
        />
      )}
    </Group>
  );
}

function SplitterNode({ splitter }: { splitter: PlacedSplitter }) {
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectMachine = useEditorStore((s) => s.selectMachine);
  const moveSplitter = useEditorStore((s) => s.moveSplitter);
  const removeSplitter = useEditorStore((s) => s.removeSplitter);

  const isSelected = selectedId === splitter.id;
  const label = splitter.type === 'splitter' ? 'Split' : 'Merge';
  const fillColor = splitter.type === 'splitter' ? '#2a3a1e' : '#1e2a3a';

  return (
    <Group
      x={splitter.x}
      y={splitter.y}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        selectMachine(splitter.id);
      }}
      onDragEnd={(e) => {
        let x = e.target.x();
        let y = e.target.y();
        const gridSnap = useEditorStore.getState().gridSnap;
        const gridSize = useEditorStore.getState().gridSize;
        if (gridSnap) {
          x = Math.round(x / gridSize) * gridSize;
          y = Math.round(y / gridSize) * gridSize;
        }
        moveSplitter(splitter.id, x, y);
      }}
    >
      <Rect
        width={SPLITTER_WIDTH}
        height={SPLITTER_HEIGHT}
        cornerRadius={4}
        fill={isSelected ? '#3a5a2e' : fillColor}
        stroke={isSelected ? '#e94560' : '#4a4a6a'}
        strokeWidth={isSelected ? 2 : 1}
      />
      <Text
        text={label}
        fontSize={10}
        fill="#c4c4c4"
        width={SPLITTER_WIDTH}
        align="center"
        y={SPLITTER_HEIGHT / 2 - 5}
      />
      {/* Input port (left) */}
      <Circle
        x={0}
        y={SPLITTER_HEIGHT / 2}
        radius={5}
        fill="#f87171"
        stroke="#333"
        strokeWidth={1}
      />
      {/* Output ports (right top and right bottom for splitter, single for merger) */}
      {splitter.type === 'splitter' ? (
        <>
          <Circle x={SPLITTER_WIDTH} y={8} radius={5} fill="#4ade80" stroke="#333" strokeWidth={1} />
          <Circle x={SPLITTER_WIDTH} y={SPLITTER_HEIGHT - 8} radius={5} fill="#4ade80" stroke="#333" strokeWidth={1} />
        </>
      ) : (
        <>
          {/* Merger: two inputs on left, one output on right */}
          <Circle x={0} y={8} radius={5} fill="#f87171" stroke="#333" strokeWidth={1} />
          <Circle x={SPLITTER_WIDTH} y={SPLITTER_HEIGHT / 2} radius={5} fill="#4ade80" stroke="#333" strokeWidth={1} />
        </>
      )}
      {isSelected && (
        <Text
          text="✕"
          fontSize={12}
          fill="#f87171"
          x={SPLITTER_WIDTH - 4}
          y={-16}
          onClick={(e) => {
            e.cancelBubble = true;
            removeSplitter(splitter.id);
          }}
        />
      )}
    </Group>
  );
}

function GroupNode({ group }: { group: PlacedGroup }) {
  const toggleGroupCollapse = useEditorStore((s) => s.toggleGroupCollapse);
  const removeGroup = useEditorStore((s) => s.removeGroup);

  return (
    <Group
      x={group.x}
      y={group.y}
      listening={false}  // don't intercept clicks — machines should be clickable through the group
    >
      <Rect
        width={group.width}
        height={group.height}
        cornerRadius={8}
        fill={group.color + '15'}  // 15 = ~8% opacity hex suffix
        stroke={group.color}
        strokeWidth={2}
        dash={[6, 4]}
      />
      <Rect
        x={0}
        y={-20}
        width={Math.max(80, group.name.length * 7 + 40)}
        height={18}
        cornerRadius={4}
        fill={group.color}
        opacity={0.8}
        listening={true}
        onClick={(e) => { e.cancelBubble = true; toggleGroupCollapse(group.id); }}
      />
      <Text
        text={group.name}
        x={6}
        y={-16}
        fontSize={11}
        fill="#fff"
        fontStyle="bold"
        listening={false}
      />
      <Text
        text="✕"
        fontSize={11}
        fill="#fff"
        x={Math.max(70, group.name.length * 7 + 30)}
        y={-16}
        listening={true}
        onClick={(e) => { e.cancelBubble = true; removeGroup(group.id); }}
      />
    </Group>
  );
}

export function FactoryCanvas() {
  const machines = useEditorStore((s) => s.machines);
  const connections = useEditorStore((s) => s.connections);
  const splitters = useEditorStore((s) => s.splitters);
  const beacons = useEditorStore((s) => s.beacons);
  const groups = useEditorStore((s) => s.groups);
  const gridSnap = useEditorStore((s) => s.gridSnap);
  const gridSize = useEditorStore((s) => s.gridSize);
  const pendingMachineId = useEditorStore((s) => s.pendingMachineId);
  const pendingBeaconId = useEditorStore((s) => s.pendingBeaconId);
  const pendingConnection = useEditorStore((s) => s.pendingConnection);
  const pendingSplitterType = useEditorStore((s) => s.pendingSplitterType);
  const addMachine = useEditorStore((s) => s.addMachine);
  const addSplitter = useEditorStore((s) => s.addSplitter);
  const addBeacon = useEditorStore((s) => s.addBeacon);
  const selectMachine = useEditorStore((s) => s.selectMachine);
  const selectMultiple = useEditorStore((s) => s.selectMultiple);
  const setPendingMachine = useEditorStore((s) => s.setPendingMachine);
  const setPendingConnection = useEditorStore((s) => s.setPendingConnection);
  const setPendingSplitter = useEditorStore((s) => s.setPendingSplitter);

  const flowResult = useFlowSolver();

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [boxSelect, setBoxSelect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  // ESC cancels pending placement (also handled globally, but this catches canvas-focused events)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingMachineId) setPendingMachine(null);
        if (pendingBeaconId) useEditorStore.getState().setPendingBeacon(null);
        if (pendingConnection) setPendingConnection(null);
        if (pendingSplitterType) setPendingSplitter(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pendingMachineId, pendingBeaconId, pendingConnection, pendingSplitterType, setPendingMachine, setPendingConnection, setPendingSplitter]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Click on empty canvas
    if (e.target === stage) {
      if (pendingConnection) {
        setPendingConnection(null);
      }
      if (pendingMachineId) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          const worldX = (pointerPos.x - pos.x) / scale;
          const worldY = (pointerPos.y - pos.y) / scale;
          addMachine(pendingMachineId, worldX - MACHINE_SIZE / 2, worldY - MACHINE_SIZE / 2);
        }
      } else if (pendingBeaconId) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          const worldX = (pointerPos.x - pos.x) / scale;
          const worldY = (pointerPos.y - pos.y) / scale;
          addBeacon(pendingBeaconId, worldX - BEACON_SIZE / 2, worldY - BEACON_SIZE / 2);
        }
      } else if (pendingSplitterType) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          const worldX = (pointerPos.x - pos.x) / scale;
          const worldY = (pointerPos.y - pos.y) / scale;
          addSplitter(pendingSplitterType, worldX - 30, worldY - 15);
        }
      } else {
        selectMachine(null);
      }
    }
  }, [pendingMachineId, pendingBeaconId, pendingConnection, pendingSplitterType, pos, scale, addMachine, addBeacon, addSplitter, selectMachine, setPendingConnection, setPendingSplitter]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(3, oldScale * delta));

    // Zoom toward the cursor position
    const mousePointTo = {
      x: (pointer.x - pos.x) / oldScale,
      y: (pointer.y - pos.y) / oldScale,
    };

    setScale(newScale);
    setPos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // Middle mouse button panning
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle mouse button (button === 1) starts panning
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.evt.clientX, y: e.evt.clientY };
      const container = e.target.getStage()?.container();
      if (container) container.style.cursor = 'grabbing';
      return;
    }

    // Left mouse button (button === 0) — start box selection on empty canvas
    const stage = e.target.getStage();
    if (!stage) return;
    if (e.target === stage && !pendingMachineId && !pendingBeaconId && !pendingConnection && !pendingSplitterType) {
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        const worldX = (pointerPos.x - pos.x) / scale;
        const worldY = (pointerPos.y - pos.y) / scale;
        setBoxSelect({ x1: worldX, y1: worldY, x2: worldX, y2: worldY });
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Handle middle-mouse panning
    if (isPanning.current) {
      const dx = e.evt.clientX - panStart.current.x;
      const dy = e.evt.clientY - panStart.current.y;
      setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
      panStart.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    // Handle box selection
    if (!boxSelect) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPos = stage.getPointerPosition();
    if (pointerPos) {
      const worldX = (pointerPos.x - pos.x) / scale;
      const worldY = (pointerPos.y - pos.y) / scale;
      setBoxSelect({ ...boxSelect, x2: worldX, y2: worldY });
    }
  };

  const handleMouseUp = () => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    if (boxSelect) {
      const minX = Math.min(boxSelect.x1, boxSelect.x2);
      const maxX = Math.max(boxSelect.x1, boxSelect.x2);
      const minY = Math.min(boxSelect.y1, boxSelect.y2);
      const maxY = Math.max(boxSelect.y1, boxSelect.y2);

      const selected = machines
        .filter((m) => m.x + MACHINE_SIZE >= minX && m.x <= maxX && m.y + MACHINE_SIZE >= minY && m.y <= maxY)
        .map((m) => m.id);

      if (selected.length > 0) {
        selectMultiple(selected);
      } else {
        selectMachine(null);
      }
      setBoxSelect(null);
    }
  };

  // Zoom to fit all content
  const zoomFit = useCallback(() => {
    const allNodes = [
      ...machines.map((m) => ({ x: m.x, y: m.y, w: MACHINE_SIZE, h: MACHINE_SIZE })),
      ...splitters.map((s) => ({ x: s.x, y: s.y, w: SPLITTER_WIDTH, h: SPLITTER_HEIGHT })),
      ...beacons.map((b) => ({ x: b.x, y: b.y, w: BEACON_SIZE, h: BEACON_SIZE })),
    ];
    if (allNodes.length === 0) return;

    const minX = Math.min(...allNodes.map((n) => n.x));
    const minY = Math.min(...allNodes.map((n) => n.y));
    const maxX = Math.max(...allNodes.map((n) => n.x + n.w));
    const maxY = Math.max(...allNodes.map((n) => n.y + n.h));

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const padding = 80;

    const scaleX = (size.width - padding * 2) / contentW;
    const scaleY = (size.height - padding * 2) / contentH;
    const newScale = Math.min(scaleX, scaleY, 2);
    const clampedScale = Math.max(0.2, newScale);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setScale(clampedScale);
    setPos({
      x: size.width / 2 - centerX * clampedScale,
      y: size.height / 2 - centerY * clampedScale,
    });
  }, [machines, splitters, beacons, size]);

  // Expose zoomFit via window for parent to call
  const zoomFitRef = useRef(zoomFit);
  zoomFitRef.current = zoomFit;
  useEffect(() => {
    (window as unknown as { __zoomFit?: () => void }).__zoomFit = () => zoomFitRef.current();
    return () => {
      delete (window as unknown as { __zoomFit?: () => void }).__zoomFit;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onAuxClick={(e) => e.preventDefault()}
      onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
      onDragOver={(e) => {
        // Allow drop
        if (e.dataTransfer.types.includes('application/x-factorio-item') ||
            e.dataTransfer.types.includes('application/x-factorio-beacon') ||
            e.dataTransfer.types.includes('application/x-factorio-splitter')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldX = (screenX - pos.x) / scale;
        const worldY = (screenY - pos.y) / scale;

        const itemId = e.dataTransfer.getData('application/x-factorio-item');
        const beaconId = e.dataTransfer.getData('application/x-factorio-beacon');
        const splitterType = e.dataTransfer.getData('application/x-factorio-splitter');

        if (itemId) {
          addMachine(itemId, worldX - MACHINE_SIZE / 2, worldY - MACHINE_SIZE / 2);
        } else if (beaconId) {
          addBeacon(beaconId, worldX - BEACON_SIZE / 2, worldY - BEACON_SIZE / 2);
        } else if (splitterType) {
          addSplitter(splitterType as 'splitter' | 'merger', worldX - 30, worldY - 15);
        }
      }}
    >
      <Stage
        width={size.width}
        height={size.height}
        onClick={handleStageClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => { e.evt.preventDefault(); }}
      >
        <Layer x={pos.x} y={pos.y} scaleX={scale} scaleY={scale}>
          {/* Grid background */}
          <Rect
            x={-5000}
            y={-5000}
            width={10000}
            height={10000}
            fill="#111122"
            listening={false}
          />
          {/* Visible grid when grid snap is on */}
          {gridSnap && (
            <Group listening={false}>
              {Array.from({ length: 101 }).map((_, i) => {
                const linePos = -500 + i * gridSize;
                return (
                  <Group key={i}>
                    {/* Vertical line */}
                    <Rect
                      x={linePos}
                      y={-500}
                      width={1}
                      height={1000}
                      fill="#1a1a3a"
                    />
                    {/* Horizontal line */}
                    <Rect
                      x={-500}
                      y={linePos}
                      width={1000}
                      height={1}
                      fill="#1a1a3a"
                    />
                  </Group>
                );
              })}
            </Group>
          )}

      {/* Splitter nodes */}
      {splitters.map((s) => (
        <SplitterNode key={s.id} splitter={s} />
      ))}

      {/* Beacon nodes (behind machines, but in front of belts) */}
      {beacons.map((b) => (
        <BeaconNode key={b.id} beacon={b} />
      ))}

      {/* Box selection rectangle */}
      {boxSelect && (
        <Rect
          x={Math.min(boxSelect.x1, boxSelect.x2)}
          y={Math.min(boxSelect.y1, boxSelect.y2)}
          width={Math.abs(boxSelect.x2 - boxSelect.x1)}
          height={Math.abs(boxSelect.y2 - boxSelect.y1)}
          fill="rgba(100, 150, 255, 0.15)"
          stroke="#6496ff"
          strokeWidth={1}
          dash={[4, 3]}
          listening={false}
        />
      )}

      {/* Render groups (behind everything) */}
      {groups.map((g) => (
        <GroupNode key={g.id} group={g} />
      ))}

      {/* Render connections first (behind machines) */}
      {connections.map((c) => (
        <BeltConnection key={c.id} connId={c.id} flowResult={flowResult} />
      ))}

          {/* Render machines on top */}
          {machines.map((m) => (
            <MachineNode key={m.id} machine={m} flowResult={flowResult} />
          ))}
        </Layer>
      </Stage>

      {/* Hint when a machine is pending placement */}
      {pendingMachineId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-factorio-accent bg-factorio-panel px-4 py-2 text-sm text-factorio-text-bright shadow-lg z-10">
          Click on canvas to place machine (ESC to cancel)
        </div>
      )}

      {/* Hint when connecting */}
      {pendingConnection && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-factorio-green bg-factorio-panel px-4 py-2 text-sm text-factorio-text-bright shadow-lg z-10">
          Click an input port (red) to connect (ESC to cancel)
        </div>
      )}

      {/* Hint when placing splitter */}
      {pendingSplitterType && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-factorio-accent bg-factorio-panel px-4 py-2 text-sm text-factorio-text-bright shadow-lg z-10">
          Click on canvas to place {pendingSplitterType} (ESC to cancel)
        </div>
      )}

      {/* Hint when placing beacon */}
      {pendingBeaconId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-factorio-accent bg-factorio-panel px-4 py-2 text-sm text-factorio-text-bright shadow-lg z-10">
          Click on canvas to place beacon (ESC to cancel)
        </div>
      )}

      {/* Status bar */}
      {flowResult && (machines.length > 0 || splitters.length > 0 || beacons.length > 0 || groups.length > 0) && (
        <div className="absolute bottom-4 left-4 rounded-lg border border-factorio-border bg-factorio-panel px-3 py-2 text-xs shadow-lg z-10">
          <div className="flex flex-col gap-1">
            <div className="flex gap-4">
              <span className="text-factorio-text">⚙️ {(flowResult.totalPower / 1000).toFixed(2)} MW</span>
              <span className="text-factorio-text">🔧 {machines.length} machines</span>
              {splitters.length > 0 && <span className="text-factorio-text">⑂ {splitters.length} splitters</span>}
              {beacons.length > 0 && <span className="text-factorio-text">📡 {beacons.length} beacons</span>}
              {groups.length > 0 && <span className="text-factorio-text">📦 {groups.length} groups</span>}
              <span className="text-factorio-text">🔗 {connections.length} belts</span>
              {flowResult.warnings.length > 0 && (
                <span className="text-factorio-yellow">⚠️ {flowResult.warnings.length} warnings</span>
              )}
            </div>
            {/* Pollution summary */}
            {flowResult.totalPollution !== undefined && flowResult.totalPollution > 0 && (
              <div className="flex gap-4 text-gray-400">
                <span>☁️ {flowResult.totalPollution.toFixed(1)}/m pollution</span>
                <span>📊 {flowResult.totalUtilization !== undefined ? `${Math.round(flowResult.totalUtilization * 100)}% avg util` : ''}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {machines.length === 0 && !pendingMachineId && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl mb-2">⚙️</p>
            <p className="text-factorio-text">Click a machine in the palette to start building</p>
          </div>
        </div>
      )}
    </div>
  );
}