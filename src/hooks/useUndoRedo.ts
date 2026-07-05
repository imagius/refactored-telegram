// Undo/redo history stack for the editor store
// Implemented as a lightweight wrapper that snapshots the machines/connections/splitters arrays

import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore, type PlacedMachine, type PlacedSplitter, type PlacedBeacon, type PlacedGroup } from '../store/editorStore';
import type { Connection } from '../types/connections';

interface Snapshot {
  machines: PlacedMachine[];
  connections: Connection[];
  splitters: PlacedSplitter[];
  beacons: PlacedBeacon[];
  groups: PlacedGroup[];
}

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const lastSnapshot = useRef<Snapshot | null>(null);
  const isApplying = useRef(false);

  const machines = useEditorStore((s) => s.machines);
  const connections = useEditorStore((s) => s.connections);
  const splitters = useEditorStore((s) => s.splitters);
  const beacons = useEditorStore((s) => s.beacons);
  const groups = useEditorStore((s) => s.groups);
  const loadFactoryState = useEditorStore((s) => s.loadFactoryState);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  // Track state changes and push to undo stack
  useEffect(() => {
    if (isApplying.current) return;

    const current: Snapshot = { machines, connections, splitters, beacons, groups };
    const last = lastSnapshot.current;

    // Only push if something actually changed
    if (last && (
      last.machines !== machines ||
      last.connections !== connections ||
      last.splitters !== splitters ||
      last.beacons !== beacons ||
      last.groups !== groups
    )) {
      undoStack.current.push(last);
      if (undoStack.current.length > MAX_HISTORY) {
        undoStack.current.shift();
      }
      // Clear redo stack on new action
      redoStack.current = [];
    }

    lastSnapshot.current = current;
  }, [machines, connections, splitters, beacons, groups]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;

    const prev = undoStack.current.pop()!;
    const current: Snapshot = {
      machines: useEditorStore.getState().machines,
      connections: useEditorStore.getState().connections,
      splitters: useEditorStore.getState().splitters,
      beacons: useEditorStore.getState().beacons,
      groups: useEditorStore.getState().groups,
    };
    redoStack.current.push(current);

    isApplying.current = true;
    loadFactoryState({
      version: 1,
      dataVersion,
      machines: prev.machines,
      connections: prev.connections,
      splitters: prev.splitters,
      beacons: prev.beacons,
      groups: prev.groups,
      savedAt: new Date().toISOString(),
    });
    setTimeout(() => { isApplying.current = false; }, 0);
  }, [loadFactoryState, dataVersion]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;

    const next = redoStack.current.pop()!;
    const current: Snapshot = {
      machines: useEditorStore.getState().machines,
      connections: useEditorStore.getState().connections,
      splitters: useEditorStore.getState().splitters,
      beacons: useEditorStore.getState().beacons,
      groups: useEditorStore.getState().groups,
    };
    undoStack.current.push(current);

    isApplying.current = true;
    loadFactoryState({
      version: 1,
      dataVersion,
      machines: next.machines,
      connections: next.connections,
      splitters: next.splitters,
      beacons: next.beacons,
      groups: next.groups,
      savedAt: new Date().toISOString(),
    });
    setTimeout(() => { isApplying.current = false; }, 0);
  }, [loadFactoryState, dataVersion]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  // Listen for Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  return { undo, redo, canUndo, canRedo };
}