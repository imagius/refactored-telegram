import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import type Konva from 'konva';
import { useEditorStore, type PlacedMachine } from '../store/editorStore';

const MACHINE_SIZE = 60;

function MachineNode({ machine }: { machine: PlacedMachine }) {
  const machineItem = useEditorStore((s) => s.getMachineItem(machine.machineId));
  const recipe = machine.recipeId ? useEditorStore((s) => s.getRecipe(machine.recipeId!)) : undefined;
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectMachine = useEditorStore((s) => s.selectMachine);
  const moveMachine = useEditorStore((s) => s.moveMachine);
  const rotateMachine = useEditorStore((s) => s.rotateMachine);

  const isSelected = selectedId === machine.id;
  const machineName = machineItem?.name || machine.machineId;
  const displayName = recipe?.name || machineName;

  // Display first 3 letters of machine name as a label since we can't easily render icons in Konva yet
  const label = displayName.length > 12 ? displayName.substring(0, 10) + '...' : displayName;

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
      <Text
        text={isSelected ? '🔄' : ''}
        fontSize={14}
        x={MACHINE_SIZE - 18}
        y={-18}
        onClick={(e) => {
          e.cancelBubble = true;
          rotateMachine(machine.id);
        }}
      />
    </Group>
  );
}

export function FactoryCanvas() {
  const machines = useEditorStore((s) => s.machines);
  const pendingMachineId = useEditorStore((s) => s.pendingMachineId);
  const addMachine = useEditorStore((s) => s.addMachine);
  const selectMachine = useEditorStore((s) => s.selectMachine);
  const setPendingMachine = useEditorStore((s) => s.setPendingMachine);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Track container size on mount and resize
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

  // ESC cancels pending placement
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingMachineId) {
        setPendingMachine(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pendingMachineId, setPendingMachine]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Click on empty canvas (the stage itself, not a child)
    const stage = e.target.getStage();
    if (!stage) return;

    if (e.target === stage) {
      if (pendingMachineId) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          const worldX = (pointerPos.x - pos.x) / scale;
          const worldY = (pointerPos.y - pos.y) / scale;
          addMachine(pendingMachineId, worldX - MACHINE_SIZE / 2, worldY - MACHINE_SIZE / 2);
        }
      } else {
        selectMachine(null);
      }
    }
  };

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
        draggable={!pendingMachineId}
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
          {machines.map((m) => (
            <MachineNode key={m.id} machine={m} />
          ))}
        </Layer>
      </Stage>

      {/* Hint when a machine is pending placement */}
      {pendingMachineId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-factorio-accent bg-factorio-panel px-4 py-2 text-sm text-factorio-text-bright shadow-lg z-10">
          Click on canvas to place machine (ESC to cancel)
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