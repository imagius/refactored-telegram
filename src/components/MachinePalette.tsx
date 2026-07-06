import { useState, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { isMachine, isBelt, isBeacon } from '../data/types';
import { IconSprite } from './IconSprite';
import type { Item } from '../data/types';
import { titleCaseName } from '../utils/titleCase';

export function MachinePalette() {
  const data = useEditorStore((s) => s.data);
  const setPendingMachine = useEditorStore((s) => s.setPendingMachine);
  const setPendingBeacon = useEditorStore((s) => s.setPendingBeacon);
  const pendingMachineId = useEditorStore((s) => s.pendingMachineId);
  const pendingBeaconId = useEditorStore((s) => s.pendingBeaconId);
  const setPendingSplitter = useEditorStore((s) => s.setPendingSplitter);
  const pendingSplitterType = useEditorStore((s) => s.pendingSplitterType);
  const [search, setSearch] = useState('');

  const { machines, belts, beacons } = useMemo(() => {
    if (!data) return { machines: [], belts: [], beacons: [] };
    const machines: Item[] = [];
    const belts: Item[] = [];
    const beacons: Item[] = [];
    for (const item of data.items) {
      if (isMachine(item)) machines.push(item);
      else if (isBelt(item)) belts.push(item);
      else if (isBeacon(item)) beacons.push(item);
    }
    return { machines, belts, beacons };
  }, [data]);

  const filteredMachines = useMemo(() => {
    if (!search) return machines;
    const q = search.toLowerCase();
    return machines.filter((m) => titleCaseName(m.name).toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  }, [machines, search]);

  const getIcon = (id: string) => data?.icons.find((i) => i.id === id);

  const renderItem = (item: Item) => {
    const icon = getIcon(item.id);
    const isSelected = pendingMachineId === item.id;
    return (
      <button
        key={item.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-factorio-item', item.id);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={() => setPendingMachine(isSelected ? null : item.id)}
        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors cursor-grab active:cursor-grabbing ${
          isSelected
            ? 'bg-factorio-accent/30 border-l-2 border-factorio-accent'
            : 'hover:bg-factorio-border border-l-2 border-transparent'
        }`}
      >
        {icon && <IconSprite icon={icon} size={24} />}
        <span className="text-factorio-text truncate">{titleCaseName(item.name)}</span>
      </button>
    );
  };

  return (
    <div className="p-2">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-factorio-text-bright">Machine Library</h2>

      <input
        type="text"
        placeholder="Search machines..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded border border-factorio-border bg-factorio-bg px-2 py-1 text-sm text-factorio-text-bright placeholder:text-gray-500 focus:border-factorio-accent focus:outline-none"
      />

      {!search && (
        <>
          <h3 className="mb-1 mt-2 text-xs font-semibold uppercase text-gray-400">Machines</h3>
        </>
      )}
      <div className="mb-3">
        {filteredMachines.map(renderItem)}
      </div>

      {!search && (
        <>
          <h3 className="mb-1 mt-2 text-xs font-semibold uppercase text-gray-400">Logistics</h3>
          <div className="mb-3">
            <button
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-factorio-splitter', 'splitter');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => {
                setPendingMachine(null);
                setPendingSplitter(pendingSplitterType === 'splitter' ? null : 'splitter');
              }}
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors cursor-grab active:cursor-grabbing ${
                pendingSplitterType === 'splitter'
                  ? 'bg-factorio-accent/30 border-l-2 border-factorio-accent'
                  : 'hover:bg-factorio-border border-l-2 border-transparent'
              }`}
            >
              <span className="text-lg">⑂</span>
              <span className="text-factorio-text">Splitter</span>
            </button>
            <button
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-factorio-splitter', 'merger');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => {
                setPendingMachine(null);
                setPendingSplitter(pendingSplitterType === 'merger' ? null : 'merger');
              }}
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors cursor-grab active:cursor-grabbing ${
                pendingSplitterType === 'merger'
                  ? 'bg-factorio-accent/30 border-l-2 border-factorio-accent'
                  : 'hover:bg-factorio-border border-l-2 border-transparent'
              }`}
            >
              <span className="text-lg">⊇</span>
              <span className="text-factorio-text">Merger</span>
            </button>
          </div>

          <h3 className="mb-1 mt-2 text-xs font-semibold uppercase text-gray-400">Belts</h3>
          <div className="mb-3">{belts.map(renderItem)}</div>
        </>
      )}

      {!search && beacons.length > 0 && (
        <>
          <h3 className="mb-1 mt-2 text-xs font-semibold uppercase text-gray-400">Beacons</h3>
          <div className="mb-3">
            {beacons.map((item) => {
              const icon = getIcon(item.id);
              const isSelected = pendingBeaconId === item.id;
              return (
                <button
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-factorio-beacon', item.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => setPendingBeacon(isSelected ? null : item.id)}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors cursor-grab active:cursor-grabbing ${
                    isSelected
                      ? 'bg-factorio-accent/30 border-l-2 border-factorio-accent'
                      : 'hover:bg-factorio-border border-l-2 border-transparent'
                  }`}
                >
                  {icon && <IconSprite icon={icon} size={24} />}
                  <span className="text-factorio-text truncate">{titleCaseName(item.name)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}