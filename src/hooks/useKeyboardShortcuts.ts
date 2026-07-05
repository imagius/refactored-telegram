import { useEffect } from 'react';
import { useEditorStore, type PlacedMachine } from '../store/editorStore';

/**
 * Global keyboard shortcuts for the editor.
 * - Delete/Backspace: Remove selected machine/connection
 * - R: Rotate selected machine
 * - Escape: Cancel pending actions
 * - Ctrl+S: Save (export)
 * - Ctrl+E: Export
 */
// Clipboard for copy/paste
let clipboard: PlacedMachine[] = [];

export function useKeyboardShortcuts() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectedConnectionId = useEditorStore((s) => s.selectedConnectionId);
  const removeMachine = useEditorStore((s) => s.removeMachine);
  const removeConnection = useEditorStore((s) => s.removeConnection);
  const rotateMachine = useEditorStore((s) => s.rotateMachine);
  const addMachine = useEditorStore((s) => s.addMachine);
  const removeSelected = useEditorStore((s) => s.removeSelected);
  const setPendingMachine = useEditorStore((s) => s.setPendingMachine);
  const setPendingConnection = useEditorStore((s) => s.setPendingConnection);
  const setPendingSplitter = useEditorStore((s) => s.setPendingSplitter);
  const pendingMachineId = useEditorStore((s) => s.pendingMachineId);
  const pendingConnection = useEditorStore((s) => s.pendingConnection);
  const pendingSplitterType = useEditorStore((s) => s.pendingSplitterType);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Ctrl+S — prevent browser save and trigger export
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return;  // auto-save handles this
      }

      // Ctrl+E — export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        return;
      }

      // Escape — cancel pending
      if (e.key === 'Escape') {
        if (pendingMachineId) setPendingMachine(null);
        if (pendingConnection) setPendingConnection(null);
        if (pendingSplitterType) setPendingSplitter(null);
        const state = useEditorStore.getState();
        if (state.pendingBeaconId) state.setPendingBeacon(null);
        return;
      }

      // Delete/Backspace — remove selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useEditorStore.getState();
        if (state.selectedIds.length > 0) {
          e.preventDefault();
          removeSelected();
        } else if (selectedId) {
          e.preventDefault();
          removeMachine(selectedId);
        } else if (selectedConnectionId) {
          e.preventDefault();
          removeConnection(selectedConnectionId);
        }
        return;
      }

      // Ctrl+D — duplicate selected machine
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const state = useEditorStore.getState();
        if (state.selectedId) {
          const m = state.machines.find((m) => m.id === state.selectedId);
          if (m) {
            addMachine(m.machineId, m.x + 70, m.y);
            // Set the same recipe on the new machine
            const state2 = useEditorStore.getState();
            const newMachine = state2.machines[state2.machines.length - 1];
            if (newMachine && m.recipeId) {
              state2.setRecipe(newMachine.id, m.recipeId);
            }
            if (newMachine && m.modules) {
              state2.setModules(newMachine.id, [...m.modules]);
            }
          }
        }
        return;
      }

      // Ctrl+C — copy selected machines
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        const state = useEditorStore.getState();
        const ids = state.selectedIds.length > 0 ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
        clipboard = state.machines
          .filter((m) => ids.includes(m.id))
          .map((m) => ({ ...m }));  // deep copy
        return;
      }

      // Ctrl+V — paste copied machines
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (clipboard.length === 0) return;
        const state = useEditorStore.getState();
        // Paste with a 20px offset
        for (const m of clipboard) {
          state.addMachine(m.machineId, m.x + 20, m.y + 20);
          const newM = state.machines[state.machines.length - 1];
          if (newM && m.recipeId) state.setRecipe(newM.id, m.recipeId);
          if (newM && m.modules) state.setModules(newM.id, [...m.modules]);
        }
        return;
      }

      // Ctrl+A — select all machines
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const state = useEditorStore.getState();
        state.selectMultiple(state.machines.map((m) => m.id));
        return;
      }

      // R — rotate selected machine
      if (e.key === 'r' || e.key === 'R') {
        if (selectedId) {
          e.preventDefault();
          rotateMachine(selectedId);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    selectedId, selectedConnectionId,
    removeMachine, removeConnection, removeSelected, rotateMachine, addMachine,
    setPendingMachine, setPendingConnection, setPendingSplitter,
    pendingMachineId, pendingConnection, pendingSplitterType,
  ]);
}