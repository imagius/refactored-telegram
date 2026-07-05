import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { MachinePalette } from './MachinePalette';
import { FactoryCanvas } from './FactoryCanvas';
import { Inspector } from './Inspector';

export function EditorLayout() {
  const loadData = useEditorStore((s) => s.loadData);
  const dataLoading = useEditorStore((s) => s.dataLoading);
  const dataError = useEditorStore((s) => s.dataError);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-factorio-bg">
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
  );
}