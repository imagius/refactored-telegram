import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Arrow, Line } from 'react-konva';
import type Konva from 'konva';
import { useEditorStore, type PlacedMachine, type PlacedSplitter } from '../store/editorStore';
import { getPortPosition, type ConnectionSide } from '../types/connections';
import { useFlowSolver } from '../hooks/useFlowSolver';

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
  const selectMachine = useEditorStore((s) => s.selectMachine);
  const moveMachine = useEditorStore((s) => s.moveMachine);
  const rotateMachine = useEditorStore((s) => s.rotateMachine);

  const isSelected = selectedId === machine.id;
  const machineName = machineItem?.name || machine.machineId;
  const displayName = recipe?.name || machineName;
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
        selectMachine(machine.id);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        selectMachine(machine.id);
      }}
      onDragEnd={(e) => {
        moveMachine(machine.id, e.target.x(), e.target.y());
      }}
    >
      <Rect
        width={MACHINE_SIZE}
        height={MACHINE_SIZE}
        cornerRadius={6}
        fill={isSelected ? '#2a4a6e' : '#1e2a4a'}
        stroke={isSelected ? '#e94560' : '#3a3a5a'}
        strokeWidth={isSelected ? 2 : 1}
        shadowColor="black"
        shadowBlur={4}
        shadowOffsetY={2}
        shadowOpacity={0.3}
      />
      <Text
        text={label}
        fontSize={9}
        fill="#c4c4c4"
        width={MACHINE_SIZE}
        align="center"
        y={MACHINE_SIZE / 2 - 6}
        wrap="none"
        ellipsis
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

function SplitterNode({ splitter, flowResult }: { splitter: PlacedSplitter; flowResult: ReturnType<typeof useFlowSolver> }) {
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
        moveSplitter(splitter.id, e.target.x(), e.target.y());
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

export function FactoryCanvas() {
  const machines = useEditorStore((s) => s.machines);
  const connections = useEditorStore((s) => s.connections);
  const splitters = useEditorStore((s) => s.splitters);
  const pendingMachineId = useEditorStore((s) => s.pendingMachineId);
  const pendingConnection = useEditorStore((s) => s.pendingConnection);
  const pendingSplitterType = useEditorStore((s) => s.pendingSplitterType);
  const addMachine = useEditorStore((s) => s.addMachine);
  const addSplitter = useEditorStore((s) => s.addSplitter);
  const selectMachine = useEditorStore((s) => s.selectMachine);
  const setPendingMachine = useEditorStore((s) => s.setPendingMachine);
  const setPendingConnection = useEditorStore((s) => s.setPendingConnection);
  const setPendingSplitter = useEditorStore((s) => s.setPendingSplitter);

  const flowResult = useFlowSolver();

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingMachineId) setPendingMachine(null);
        if (pendingConnection) setPendingConnection(null);
        if (pendingSplitterType) setPendingSplitter(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pendingMachineId, pendingConnection, pendingSplitterType, setPendingMachine, setPendingConnection, setPendingSplitter]);

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
  }, [pendingMachineId, pendingConnection, pendingSplitterType, pos, scale, addMachine, addSplitter, selectMachine, setPendingConnection, setPendingSplitter]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(0.2, Math.min(3, s * delta)));
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Stage
        width={size.width}
        height={size.height}
        onClick={handleStageClick}
        onWheel={handleWheel}
        draggable={!pendingMachineId && !pendingConnection && !pendingSplitterType}
        onDragEnd={(e) => {
          setPos({ x: e.target.x(), y: e.target.y() });
        }}
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

      {/* Splitter nodes */}
      {splitters.map((s) => (
        <SplitterNode key={s.id} splitter={s} flowResult={flowResult} />
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

      {/* Status bar */}
      {flowResult && (machines.length > 0) && (
        <div className="absolute bottom-4 left-4 rounded-lg border border-factorio-border bg-factorio-panel px-3 py-2 text-xs shadow-lg z-10">
          <div className="flex gap-4">
            <span className="text-factorio-text">⚙️ {(flowResult.totalPower / 1000).toFixed(2)} MW</span>
            <span className="text-factorio-text">🔧 {machines.length} machines</span>
            <span className="text-factorio-text">🔗 {connections.length} belts</span>
            {flowResult.warnings.length > 0 && (
              <span className="text-factorio-yellow">⚠️ {flowResult.warnings.length} warnings</span>
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