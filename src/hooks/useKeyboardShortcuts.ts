import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

/**
 * Global keyboard shortcuts for the editor.
 * - Delete/Backspace: Remove selected machine/connection
 * - R: Rotate selected machine
 * - Escape: Cancel pending actions
 * - Ctrl+S: Save (export)
 * - Ctrl+E: Export
 */
export function useKeyboardShortcuts() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectedConnectionId = useEditorStore((s) => s.selectedConnectionId);
  const removeMachine = useEditorStore((s) => s.removeMachine);
  const removeConnection = useEditorStore((s) => s.removeConnection);
  const rotateMachine = useEditorStore((s) => s.rotateMachine);
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
        return;
      }

      // Delete/Backspace — remove selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          removeMachine(selectedId);
        } else if (selectedConnectionId) {
          e.preventDefault();
          removeConnection(selectedConnectionId);
        }
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
    removeMachine, removeConnection, rotateMachine,
    setPendingMachine, setPendingConnection, setPendingSplitter,
    pendingMachineId, pendingConnection, pendingSplitterType,
  ]);
}