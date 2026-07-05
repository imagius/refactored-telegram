import { useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { exportFactory, importFactory, saveToSlot, loadFromSlot, getSlots, deleteSlot } from '../store/persistence';
import type { DatasetVersion } from '../data/loader';

interface ToolbarProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onZoomFit: () => void;
}

export function Toolbar({ undo, redo, canUndo, canRedo, onZoomFit }: ToolbarProps) {
  const machines = useEditorStore((s) => s.machines);
  const connections = useEditorStore((s) => s.connections);
  const splitters = useEditorStore((s) => s.splitters);
  const beacons = useEditorStore((s) => s.beacons);
  const dataVersion = useEditorStore((s) => s.dataVersion);
  const setDataVersion = useEditorStore((s) => s.setDataVersion);
  const loadFactoryState = useEditorStore((s) => s.loadFactoryState);
  const clearCanvas = useEditorStore((s) => s.clearCanvas);
  const gridSnap = useEditorStore((s) => s.gridSnap);
  const toggleGridSnap = useEditorStore((s) => s.toggleGridSnap);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectedId = useEditorStore((s) => s.selectedId);
  const createGroup = useEditorStore((s) => s.createGroup);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSlots, setShowSlots] = useState(false);
  const [slotName, setSlotName] = useState('');
  const [slots, setSlots] = useState<Record<string, unknown>>({});

  const handleExport = () => {
    exportFactory({ dataVersion, machines, connections, splitters, beacons }, 'factorio-modeler-factory.json');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const state = await importFactory(file);
    if (state) {
      loadFactoryState(state);
    }
    e.target.value = '';  // reset
  };

  const handleSaveSlot = () => {
    if (!slotName.trim()) return;
    saveToSlot(slotName.trim(), { dataVersion, machines, connections, splitters, beacons });
    setSlotName('');
    setSlots(getSlots());
  };

  const handleLoadSlot = (name: string) => {
    const state = loadFromSlot(name);
    if (state) loadFactoryState(state);
    setShowSlots(false);
  };

  const handleDeleteSlot = (name: string) => {
    deleteSlot(name);
    setSlots(getSlots());
  };

  const handleDatasetChange = (version: DatasetVersion) => {
    if (version !== dataVersion) {
      setDataVersion(version);
    }
  };

  const handleClear = () => {
    if (confirm('Clear all machines and connections?')) {
      clearCanvas();
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-factorio-border bg-factorio-panel px-3 py-1.5 text-sm">
      <span className="font-bold text-factorio-text-bright">Factorio Modeler</span>

      <div className="mx-2 h-5 w-px bg-factorio-border" />

      {/* Dataset selector */}
      <select
        value={dataVersion}
        onChange={(e) => handleDatasetChange(e.target.value as DatasetVersion)}
        className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text-bright"
      >
        <option value="2.0">Factorio 2.0</option>
        <option value="space-age">Space Age</option>
      </select>

      <div className="mx-2 h-5 w-px bg-factorio-border" />

      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
      >
        ↷ Redo
      </button>

      <div className="mx-2 h-5 w-px bg-factorio-border" />

      {/* Save slot */}
      <button
        onClick={() => { setShowSlots(!showSlots); setSlots(getSlots()); }}
        className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border"
      >
        💾 Slots
      </button>

      {showSlots && (
        <div className="absolute top-10 left-44 z-20 rounded-lg border border-factorio-border bg-factorio-panel p-3 shadow-xl">
          <div className="mb-2 flex gap-1">
            <input
              type="text"
              placeholder="Slot name..."
              value={slotName}
              onChange={(e) => setSlotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSlot()}
              className="w-32 rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text-bright"
            />
            <button onClick={handleSaveSlot} className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border">
              Save
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {Object.keys(slots).length === 0 ? (
              <p className="text-xs text-gray-500">No saved slots</p>
            ) : (
              Object.entries(slots).map(([name]) => (
                <div key={name} className="flex items-center gap-2 py-0.5">
                  <button onClick={() => handleLoadSlot(name)} className="flex-1 text-left text-xs text-factorio-text hover:text-factorio-text-bright">
                    📁 {name}
                  </button>
                  <button onClick={() => handleDeleteSlot(name)} className="text-xs text-factorio-red hover:text-red-400">
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Export */}
      <button onClick={handleExport} className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border">
        ⬆ Export
      </button>

      {/* Import */}
      <button onClick={() => fileInputRef.current?.click()} className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border">
        ⬇ Import
      </button>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

      <div className="mx-2 h-5 w-px bg-factorio-border" />

      {/* Grid snap toggle */}
      <button
        onClick={toggleGridSnap}
        className={`rounded border px-2 py-0.5 text-xs ${
          gridSnap
            ? 'border-factorio-green/50 bg-factorio-green/10 text-factorio-green'
            : 'border-factorio-border bg-factorio-bg text-factorio-text hover:bg-factorio-border'
        }`}
        title="Toggle grid snapping"
      >
        📐 Grid
      </button>

      {/* Create group from selection */}
      {(selectedIds.length >= 2 || selectedId) && (
        <button
          onClick={() => {
            const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
            if (ids.length > 0) {
              const name = prompt('Group name:', 'Sub-factory');
              if (name) createGroup(name, ids);
            }
          }}
          className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border"
          title="Create sub-factory group from selected machines"
        >
          📦 Group
        </button>
      )}

      {/* Zoom to fit */}
      <button
        onClick={onZoomFit}
        className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border"
        title="Zoom to fit all content"
      >
        🔍 Fit
      </button>

      {/* Clear */}
      <button onClick={handleClear} className="rounded border border-factorio-red/50 bg-factorio-red/10 px-2 py-0.5 text-xs text-factorio-red hover:bg-factorio-red/20">
        🗑 Clear
      </button>

      {/* Help */}
      <button
        onClick={() => {
          // Dispatch a synthetic '?' keydown to toggle the help overlay
          window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
        }}
        className="rounded border border-factorio-border bg-factorio-bg px-2 py-0.5 text-xs text-factorio-text hover:bg-factorio-border"
        title="Show keyboard shortcuts (?)"
      >
        ? Help
      </button>

      {/* Stats on the right */}
      <div className="ml-auto flex gap-3 text-xs text-gray-400">
        {machines.length > 0 && (
          <>
            <span>🔧 {machines.length}</span>
            <span>🔗 {connections.length}</span>
          </>
        )}
      </div>
    </div>
  );
}