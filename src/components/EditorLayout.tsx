import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { MachinePalette } from './MachinePalette';
import { FactoryCanvas } from './FactoryCanvas';
import { Inspector } from './Inspector';
import { Toolbar } from './Toolbar';
import { autoSave, loadAutoSave } from '../store/persistence';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { HelpOverlay } from './HelpOverlay';

export function EditorLayout() {
  const loadData = useEditorStore((s) => s.loadData);
  const loadFactoryState = useEditorStore((s) => s.loadFactoryState);
  const dataLoading = useEditorStore((s) => s.dataLoading);
  const dataError = useEditorStore((s) => s.dataError);
  const machines = useEditorStore((s) => s.machines);
  const connections = useEditorStore((s) => s.connections);
  const splitters = useEditorStore((s) => s.splitters);
  const beacons = useEditorStore((s) => s.beacons);
  const groups = useEditorStore((s) => s.groups);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Undo/redo
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  // Zoom to fit handler — calls the function exposed by FactoryCanvas
  const handleZoomFit = () => {
    const fn = (window as unknown as { __zoomFit?: () => void }).__zoomFit;
    if (fn) fn();
  };

  // Load data on startup
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load auto-saved factory after data is loaded
  useEffect(() => {
    if (!dataLoading && !dataError && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      const saved = loadAutoSave();
      if (saved && (saved.machines.length > 0 || saved.connections.length > 0)) {
        loadFactoryState(saved);
      }
    }
  }, [dataLoading, dataError, loadFactoryState]);

  // Auto-save on changes (debounced 1s)
  useEffect(() => {
    if (!hasLoadedRef.current) return;  // don't save before we've loaded

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      autoSave({ dataVersion, machines, connections, splitters, beacons, groups });
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [machines, connections, splitters, beacons, groups, dataVersion]);

  if (dataError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-factorio-red">
        <div className="text-center">
          <h2 className="text-xl font-bold">Failed to load data</h2>
          <p className="mt-2 text-sm">{dataError}</p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-factorio-text">Loading Factorio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-factorio-bg">
      {/* Top toolbar */}
      <Toolbar undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} onZoomFit={handleZoomFit} />

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Machine Palette */}
        <aside className="w-64 flex-shrink-0 border-r border-factorio-border bg-factorio-panel overflow-y-auto">
          <MachinePalette />
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <FactoryCanvas />
        </main>

        {/* Right: Inspector */}
        <aside className="w-72 flex-shrink-0 border-l border-factorio-border bg-factorio-panel overflow-y-auto">
          <Inspector />
        </aside>
      </div>

      {/* Help overlay */}
      <HelpOverlay />
    </div>
  );
}