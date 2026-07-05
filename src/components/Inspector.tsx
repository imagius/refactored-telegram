import { useState, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { isMachine } from '../data/types';
import { IconSprite } from './IconSprite';
import type { Recipe } from '../data/types';

export function Inspector() {
  const machine = useEditorStore((s) => s.machines.find((m) => m.id === s.selectedId));
  const getMachineItem = useEditorStore((s) => s.getMachineItem);
  const getRecipe = useEditorStore((s) => s.getRecipe);
  const getRecipesForMachine = useEditorStore((s) => s.getRecipesForMachine);
  const data = useEditorStore((s) => s.data);
  const setRecipe = useEditorStore((s) => s.setRecipe);
  const removeMachine = useEditorStore((s) => s.removeMachine);
  const rotateMachine = useEditorStore((s) => s.rotateMachine);
  const [recipeSearch, setRecipeSearch] = useState('');

  const machineItem = machine ? getMachineItem(machine.machineId) : undefined;
  const recipe = machine?.recipeId ? getRecipe(machine.recipeId) : undefined;
  const recipesForMachine = machine ? getRecipesForMachine(machine.machineId) : [];

  const getIcon = (id: string) => data?.icons.find((i) => i.id === id);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch) return recipesForMachine;
    const q = recipeSearch.toLowerCase();
    return recipesForMachine.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [recipesForMachine, recipeSearch]);

  if (!machine || !machineItem) {
    return (
      <div className="p-3">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-factorio-text-bright">Inspector</h2>
        <p className="text-sm text-gray-500">Select a machine to view its properties</p>
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
          <div className="text-sm font-semibold text-factorio-text-bright">{machineItem.name}</div>
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
                      <span className="text-factorio-text truncate">{r.name}</span>
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

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => rotateMachine(machine.id)}
          className="flex-1 rounded border border-factorio-border bg-factorio-bg px-2 py-1.5 text-xs text-factorio-text hover:bg-factorio-border transition-colors"
        >
          🔄 Rotate
        </button>
        <button
          onClick={() => removeMachine(machine.id)}
          className="flex-1 rounded border border-factorio-red/50 bg-factorio-red/10 px-2 py-1.5 text-xs text-factorio-red hover:bg-factorio-red/20 transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
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
        <span className="text-sm font-semibold text-factorio-text-bright">{recipe.name}</span>
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
                    <span className="text-factorio-text">{qty}x {item?.name || id}</span>
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
                    <span className="text-factorio-text">{qty}x {item?.name || id}</span>
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