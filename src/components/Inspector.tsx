import { useState, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { isMachine } from '../data/types';
import { IconSprite } from './IconSprite';
import type { Recipe, Item } from '../data/types';
import { titleCaseName } from '../utils/titleCase';

export function Inspector() {
  const machine = useEditorStore((s) => s.machines.find((m) => m.id === s.selectedId));
  const getMachineItem = useEditorStore((s) => s.getMachineItem);
  const getRecipe = useEditorStore((s) => s.getRecipe);
  const getRecipesForMachine = useEditorStore((s) => s.getRecipesForMachine);
  const data = useEditorStore((s) => s.data);
  const setRecipe = useEditorStore((s) => s.setRecipe);
  const removeMachine = useEditorStore((s) => s.removeMachine);
  const rotateMachine = useEditorStore((s) => s.rotateMachine);
  const setModules = useEditorStore((s) => s.setModules);
  const addMachine = useEditorStore((s) => s.addMachine);
  const [recipeSearch, setRecipeSearch] = useState('');

  const machineItem = machine ? getMachineItem(machine.machineId) : undefined;
  const recipe = machine?.recipeId ? getRecipe(machine.recipeId) : undefined;
  const recipesForMachine = machine ? getRecipesForMachine(machine.machineId) : [];
  const selectedConnection = useEditorStore((s) => s.connections.find((c) => c.id === s.selectedConnectionId));

  const getIcon = (id: string) => data?.icons.find((i) => i.id === id);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch) return recipesForMachine;
    const q = recipeSearch.toLowerCase();
    return recipesForMachine.filter((r) => titleCaseName(r.name).toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [recipesForMachine, recipeSearch]);

  if (!machine || !machineItem) {
    // Check if a beacon is selected
    const selectedBeacon = useEditorStore.getState().beacons.find((b) => b.id === useEditorStore.getState().selectedId);
    if (selectedBeacon) {
      return <BeaconInspector beacon={selectedBeacon} />;
    }
    // Show connection inspector if a connection is selected
    if (selectedConnection) {
      return <ConnectionInspector connId={selectedConnection.id} />;
    }
    return (
      <div className="p-3">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-factorio-text-bright">Inspector</h2>
        <p className="text-sm text-gray-500">Select a machine or belt to view its properties</p>
      </div>
    );
  }

  const machineProps = isMachine(machineItem) ? machineItem.machine : undefined;
  const icon = getIcon(machine.machineId);

  return (
    <div className="p-3">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-factorio-text-bright">Inspector</h2>

      {/* Machine header */}
      <div className="flex items-center gap-2 mb-3">
        {icon && <IconSprite icon={icon} size={32} />}
        <div>
          <div className="text-sm font-semibold text-factorio-text-bright">{titleCaseName(machineItem.name)}</div>
          <div className="text-xs text-gray-500">{machineItem.id}</div>
        </div>
      </div>

      {/* Machine stats */}
      {machineProps && (
        <div className="mb-4 space-y-1 text-xs">
          {machineProps.speed !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Speed:</span>
              <span className="text-factorio-text-bright">{machineProps.speed}x</span>
            </div>
          )}
          {machineProps.modules !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Module slots:</span>
              <span className="text-factorio-text-bright">{machineProps.modules}</span>
            </div>
          )}
          {machineProps.usage !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Power:</span>
              <span className="text-factorio-text-bright">{(machineProps.usage / 1000).toFixed(2)} MW</span>
            </div>
          )}
          {machineProps.pollution !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Pollution:</span>
              <span className="text-factorio-text-bright">{machineProps.pollution}/m</span>
            </div>
          )}
          {machineProps.size && (
            <div className="flex justify-between">
              <span className="text-gray-400">Size:</span>
              <span className="text-factorio-text-bright">{machineProps.size[0]}×{machineProps.size[1]}</span>
            </div>
          )}
          {machineProps.type && (
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <span className="text-factorio-text-bright capitalize">{machineProps.type}</span>
            </div>
          )}
        </div>
      )}

      {/* Recipe selection */}
      {recipesForMachine.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Recipe</h3>
          {recipe ? (
            <RecipeDisplay recipe={recipe} onClear={() => setRecipe(machine.id, undefined)} />
          ) : (
            <div>
              <input
                type="text"
                placeholder="Search recipes..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="mb-2 w-full rounded border border-factorio-border bg-factorio-bg px-2 py-1 text-sm text-factorio-text-bright placeholder:text-gray-500 focus:border-factorio-accent focus:outline-none"
              />
              <div className="max-h-60 overflow-y-auto rounded border border-factorio-border">
                {filteredRecipes.slice(0, 50).map((r) => {
                  const rIcon = getIcon(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRecipe(machine.id, r.id)}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-factorio-border transition-colors"
                    >
                      {rIcon && <IconSprite icon={rIcon} size={20} />}
                      <span className="text-factorio-text truncate">{titleCaseName(r.name)}</span>
                    </button>
                  );
                })}
                {filteredRecipes.length === 0 && (
                  <p className="px-2 py-2 text-sm text-gray-500">No recipes found</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Module slots */}
      {machineProps?.modules && machineProps.modules > 0 && (
        <div className="mb-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Modules ({machineProps.modules} slots)</h3>
          <div className="space-y-1.5">
            {Array.from({ length: machineProps.modules }).map((_, slotIdx) => {
              const currentModId = machine.modules?.[slotIdx];
              return (
                <select
                  key={slotIdx}
                  value={currentModId ?? ''}
                  onChange={(e) => {
                    const newModules = [...(machine.modules ?? [])];
                    while (newModules.length < machineProps.modules!) newModules.push('');
                    if (e.target.value) {
                      newModules[slotIdx] = e.target.value;
                    } else {
                      newModules[slotIdx] = '';
                    }
                    setModules(machine.id, newModules.filter((m) => m !== ''));
                  }}
                  className="w-full rounded border border-factorio-border bg-factorio-bg px-2 py-1 text-xs text-factorio-text-bright"
                >
                  <option value="">Empty</option>
                  {data?.items
                    .filter((i) => i.module !== undefined)
                    .map((mod) => (
                      <option key={mod.id} value={mod.id}>
                        {titleCaseName(mod.name)}
                        {mod.module?.speed ? ` (+${Math.round(mod.module.speed * 100)}% speed)` : ''}
                        {mod.module?.productivity ? ` (+${Math.round(mod.module.productivity * 100)}% prod)` : ''}
                      </option>
                    ))}
                </select>
              );
            })}
          </div>
          {/* Show active effects summary */}
          {machine.modules && machine.modules.length > 0 && (
            <div className="mt-2 rounded border border-factorio-border bg-factorio-bg p-2 text-xs">
              {(() => {
                const moduleItems = machine.modules!
                  .map((modId) => data?.items.find((i) => i.id === modId))
                  .filter(Boolean) as Item[];
                const speedBonus = moduleItems.reduce((sum, m) => sum + (m.module?.speed ?? 0), 0);
                const prodBonus = moduleItems.reduce((sum, m) => sum + (m.module?.productivity ?? 0), 0);
                const powerBonus = moduleItems.reduce((sum, m) => sum + (m.module?.consumption ?? 0), 0);
                return (
                  <div className="space-y-0.5">
                    {speedBonus !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Speed:</span>
                        <span className={speedBonus > 0 ? 'text-factorio-green' : 'text-factorio-red'}>
                          {speedBonus > 0 ? '+' : ''}{Math.round(speedBonus * 100)}%
                        </span>
                      </div>
                    )}
                    {prodBonus !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Productivity:</span>
                        <span className="text-factorio-green">+{Math.round(prodBonus * 100)}%</span>
                      </div>
                    )}
                    {powerBonus !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Power:</span>
                        <span className={powerBonus > 0 ? 'text-factorio-red' : 'text-factorio-green'}>
                          {powerBonus > 0 ? '+' : ''}{Math.round(powerBonus * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => rotateMachine(machine.id)}
          className="flex-1 rounded border border-factorio-border bg-factorio-bg px-2 py-1.5 text-xs text-factorio-text hover:bg-factorio-border transition-colors"
        >
          🔄 Rotate
        </button>
        <button
          onClick={() => {
            addMachine(machine.machineId, machine.x + 70, machine.y);
            const state = useEditorStore.getState();
            const newM = state.machines[state.machines.length - 1];
            if (newM && machine.recipeId) state.setRecipe(newM.id, machine.recipeId);
            if (newM && machine.modules) state.setModules(newM.id, [...machine.modules]);
          }}
          className="flex-1 rounded border border-factorio-border bg-factorio-bg px-2 py-1.5 text-xs text-factorio-text hover:bg-factorio-border transition-colors"
          title="Duplicate (Ctrl+D)"
        >
          📋 Duplicate
        </button>
        <button
          onClick={() => removeMachine(machine.id)}
          className="flex-1 rounded border border-factorio-red/50 bg-factorio-red/10 px-2 py-1.5 text-xs text-factorio-red hover:bg-factorio-red/20 transition-colors"
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}

function BeaconInspector({ beacon }: { beacon: import('../store/editorStore').PlacedBeacon }) {
  const data = useEditorStore((s) => s.data);
  const setBeaconModule = useEditorStore((s) => s.setBeaconModule);
  const removeBeacon = useEditorStore((s) => s.removeBeacon);
  const getIcon = (id: string) => data?.icons.find((i) => i.id === id);

  const beaconItem = data?.items.find((i) => i.id === beacon.beaconId);
  const beaconProps = beaconItem?.beacon;
  const icon = getIcon(beacon.beaconId);
  const moduleItem = beacon.moduleId ? data?.items.find((m) => m.id === beacon.moduleId) : undefined;
  const modules = data?.items.filter((i) => i.module !== undefined) ?? [];

  return (
    <div className="p-3">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-factorio-text-bright">Beacon</h2>

      {/* Beacon header */}
      <div className="flex items-center gap-2 mb-3">
        {icon && <IconSprite icon={icon} size={32} />}
        <div>
          <div className="text-sm font-semibold text-factorio-text-bright">{beaconItem ? titleCaseName(beaconItem.name) : beacon.beaconId}</div>
          <div className="text-xs text-gray-500">{beacon.beaconId}</div>
        </div>
      </div>

      {/* Beacon stats */}
      {beaconProps && (
        <div className="mb-4 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Effectivity:</span>
            <span className="text-factorio-text-bright">{beaconProps.effectivity}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Range:</span>
            <span className="text-factorio-text-bright">{beaconProps.range} tiles</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Module Slots:</span>
            <span className="text-factorio-text-bright">{beaconProps.modules}</span>
          </div>
          {beaconProps.usage && (
            <div className="flex justify-between">
              <span className="text-gray-400">Power:</span>
              <span className="text-factorio-text-bright">{(beaconProps.usage / 1000).toFixed(2)} MW</span>
            </div>
          )}
        </div>
      )}

      {/* Module selector */}
      <div className="mb-4">
        <h3 className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Module</h3>
        <select
          value={beacon.moduleId ?? ''}
          onChange={(e) => setBeaconModule(beacon.id, e.target.value || undefined)}
          className="w-full rounded border border-factorio-border bg-factorio-bg px-2 py-1 text-xs text-factorio-text-bright"
        >
          <option value="">No Module</option>
          {modules.map((mod) => (
            <option key={mod.id} value={mod.id}>
              {titleCaseName(mod.name)}
              {mod.module?.speed ? ` (+${Math.round(mod.module.speed * 100)}% speed)` : ''}
              {mod.module?.productivity ? ` (+${Math.round(mod.module.productivity * 100)}% prod)` : ''}
            </option>
          ))}
        </select>

        {/* Active module effects */}
        {moduleItem?.module && (
          <div className="mt-2 rounded border border-factorio-border bg-factorio-bg p-2 text-xs">
            <div className="space-y-0.5">
              {moduleItem.module.speed && moduleItem.module.speed !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Speed bonus:</span>
                  <span className="text-factorio-green">
                    +{Math.round(moduleItem.module.speed * beaconProps!.effectivity * 100)}% effective
                  </span>
                </div>
              )}
              {moduleItem.module.productivity && moduleItem.module.productivity !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Productivity bonus:</span>
                  <span className="text-factorio-green">
                    +{Math.round(moduleItem.module.productivity * beaconProps!.effectivity * 100)}% effective
                  </span>
                </div>
              )}
              {moduleItem.module.consumption && moduleItem.module.consumption !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Power cost:</span>
                  <span className={moduleItem.module.consumption < 0 ? 'text-factorio-green' : 'text-factorio-red'}>
                    {moduleItem.module.consumption > 0 ? '+' : ''}{Math.round(moduleItem.module.consumption * beaconProps!.effectivity * 100)}% effective
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={() => removeBeacon(beacon.id)}
        className="w-full rounded border border-factorio-red/50 bg-factorio-red/10 px-2 py-1.5 text-xs text-factorio-red hover:bg-factorio-red/20 transition-colors"
      >
        🗑 Delete Beacon
      </button>
    </div>
  );
}

function ConnectionInspector({ connId }: { connId: string }) {
  const conn = useEditorStore((s) => s.connections.find((c) => c.id === connId));
  const data = useEditorStore((s) => s.data);
  const removeConnection = useEditorStore((s) => s.removeConnection);
  const fromMachine = useEditorStore((s) => conn ? s.machines.find((m) => m.id === conn.fromMachineId) : undefined);
  const toMachine = useEditorStore((s) => conn ? s.machines.find((m) => m.id === conn.toMachineId) : undefined);
  const fromItem = fromMachine ? useEditorStore.getState().getMachineItem(fromMachine.machineId) : undefined;
  const toItem = toMachine ? useEditorStore.getState().getMachineItem(toMachine.machineId) : undefined;

  if (!conn) {
    return (
      <div className="p-3">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-factorio-text-bright">Inspector</h2>
        <p className="text-sm text-gray-500">Select a machine or belt to view its properties</p>
      </div>
    );
  }

  const isPipe = conn.type === 'pipe';
  const belts = data?.items.filter((i) => i.belt !== undefined) ?? [];
  const pipes = data?.items.filter((i) => i.pipe !== undefined) ?? [];

  return (
    <div className="p-3">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-factorio-text-bright">
        {isPipe ? 'Pipe Connection' : 'Belt Connection'}
      </h2>

      <div className="mb-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">From:</span>
          <span className="text-factorio-text-bright">{fromItem ? titleCaseName(fromItem.name) : conn.fromMachineId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">To:</span>
          <span className="text-factorio-text-bright">{toItem ? titleCaseName(toItem.name) : conn.toMachineId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Type:</span>
          <span className="text-factorio-text-bright capitalize" style={isPipe ? { color: '#60a5fa' } : undefined}>{conn.type}</span>
        </div>
      </div>

      {/* Belt tier selector */}
      {!isPipe && (
        <>
          <h3 className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Belt Tier</h3>
          <select
            value={conn.beltId ?? ''}
            onChange={(e) => {
              useEditorStore.setState((state) => ({
                connections: state.connections.map((c) =>
                  c.id === connId ? { ...c, beltId: e.target.value || undefined } : c
                ),
              }));
            }}
            className="w-full rounded border border-factorio-border bg-factorio-bg px-2 py-1 text-xs text-factorio-text-bright"
          >
            {belts.map((belt) => (
              <option key={belt.id} value={belt.id}>
                {titleCaseName(belt.name)} ({belt.belt?.speed} items/s)
              </option>
            ))}
          </select>

          {/* Belt speed info */}
          {conn.beltId && (() => {
            const belt = data?.items.find((i) => i.id === conn.beltId);
            return belt?.belt ? (
              <div className="mt-2 rounded border border-factorio-border bg-factorio-bg p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Max throughput:</span>
                  <span className="text-factorio-green">{belt.belt.speed} items/sec</span>
                </div>
              </div>
            ) : null;
          })()}
        </>
      )}

      {/* Pipe tier selector */}
      {isPipe && (
        <>
          <h3 className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Pipe Tier</h3>
          {pipes.length > 0 ? (
            <select
              value={conn.pipeId ?? ''}
              onChange={(e) => {
                useEditorStore.setState((state) => ({
                  connections: state.connections.map((c) =>
                    c.id === connId ? { ...c, pipeId: e.target.value || undefined } : c
                  ),
                }));
              }}
              className="w-full rounded border border-factorio-border bg-factorio-bg px-2 py-1 text-xs text-factorio-text-bright"
            >
              {pipes.map((pipe) => (
                <option key={pipe.id} value={pipe.id}>
                  {titleCaseName(pipe.name)} ({pipe.pipe?.speed} fluid/s)
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">No pipe items available in dataset</p>
          )}

          {/* Pipe speed info */}
          {conn.pipeId && (() => {
            const pipe = data?.items.find((i) => i.id === conn.pipeId);
            return pipe?.pipe ? (
              <div className="mt-2 rounded border border-factorio-border bg-factorio-bg p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Max throughput:</span>
                  <span className="text-factorio-blue" style={{ color: '#60a5fa' }}>{pipe.pipe.speed} fluid/sec</span>
                </div>
              </div>
            ) : null;
          })()}
        </>
      )}

      <button
        onClick={() => removeConnection(connId)}
        className="mt-3 w-full rounded border border-factorio-red/50 bg-factorio-red/10 px-2 py-1.5 text-xs text-factorio-red hover:bg-factorio-red/20 transition-colors"
      >
        🗑 Delete Connection
      </button>
    </div>
  );
}

function RecipeDisplay({ recipe, onClear }: { recipe: Recipe; onClear: () => void }) {
  const data = useEditorStore((s) => s.data);
  const getIcon = (id: string) => data?.icons.find((i) => i.id === id);
  const recipeIcon = getIcon(recipe.id);

  return (
    <div className="rounded border border-factorio-border bg-factorio-bg p-2">
      <div className="flex items-center gap-2 mb-2">
        {recipeIcon && <IconSprite icon={recipeIcon} size={24} />}
        <span className="text-sm font-semibold text-factorio-text-bright">{titleCaseName(recipe.name)}</span>
      </div>

      <div className="text-xs space-y-2">
        {/* Inputs */}
        {Object.entries(recipe.in).length > 0 && (
          <div>
            <div className="text-gray-400 mb-1">Inputs:</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(recipe.in).map(([id, qty]) => {
                const icon = getIcon(id);
                const item = data?.items.find((i) => i.id === id);
                return (
                  <div key={id} className="flex items-center gap-1 rounded bg-factorio-panel px-1.5 py-0.5">
                    {icon && <IconSprite icon={icon} size={16} />}
                    <span className="text-factorio-text">{qty}x {item ? titleCaseName(item.name) : id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Outputs */}
        {Object.entries(recipe.out).length > 0 && (
          <div>
            <div className="text-gray-400 mb-1">Outputs:</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(recipe.out).map(([id, qty]) => {
                const icon = getIcon(id);
                const item = data?.items.find((i) => i.id === id);
                return (
                  <div key={id} className="flex items-center gap-1 rounded bg-factorio-panel px-1.5 py-0.5">
                    {icon && <IconSprite icon={icon} size={16} />}
                    <span className="text-factorio-text">{qty}x {item ? titleCaseName(item.name) : id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-1 border-t border-factorio-border">
          <span className="text-gray-400">Craft time:</span>
          <span className="text-factorio-text-bright">{recipe.time}s</span>
        </div>
      </div>

      <button
        onClick={onClear}
        className="mt-2 w-full rounded border border-factorio-border px-2 py-1 text-xs text-gray-400 hover:bg-factorio-border hover:text-factorio-text transition-colors"
      >
        Change recipe
      </button>
    </div>
  );
}