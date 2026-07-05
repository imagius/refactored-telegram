# Factorio Modeler

A visual canvas-based factory modeler for Factorio — drag machines onto a canvas, connect them with belts, and the tool simulates item flow, calculates throughput, and flags bottlenecks.

Inspired by [Satisfactory Modeler](https://store.steampowered.com/app/3187030/Satisfactory_Modeler/) on Steam, adapted for Factorio's mechanics: inserters, two-lane belts, splitters, fluid pipes, modules/beacons, and power grid.

## Features

### Editor
- **Visual canvas** — drag machines, pan/zoom, rotate, delete
- **Three-panel layout** — palette (left), canvas (center), inspector (right)
- **Machine palette** with search, grouped by category (Machines, Logistics, Belts, Beacons)
- **Inspector** — machine stats (speed, power, pollution, size, module slots), recipe picker with search, recipe I/O display
- **Module slots** — assign speed/productivity modules to machines, see active effect bonuses (speed, productivity, power)
- **Grid snapping** — toggle grid alignment for clean layouts
- **Machine duplication** — Ctrl+D or 📋 button duplicates machine with recipe and modules

### Flow Engine
- **Iterative fixpoint solver** — computes items/sec through every belt, machine utilization (0-100%), and bottleneck detection
- **Belt capacity enforcement** — if a belt can't carry the flow, it's capped and flagged as a bottleneck
- **Visual overlay** — color-coded belts (green/yellow/red), items/sec labels, utilization bars on machines
- **Status bar** — total power (MW), machine count, splitter count, belt count, warnings
- **Module effects** — speed and productivity modules modify machine output rates in the solver; power consumption scales with module bonuses
- **Belt tier selection** — click a belt to select it, change belt tier in the inspector (yellow/red/express)

### Logistics
- **Splitters & mergers** — placeable canvas nodes with flow routing
- **Port-to-port connections** — click green output port → click red input port to create belts
- **Double-click a belt to delete it**

### Models
- **Inserter throughput** — calculates inserter count needed for any belt flow, handles fraction speed strings
- **Module/beacon effects** — speed, productivity, consumption, pollution bonuses; beacon effectivity × count
- **Fluid pipe throughput** — pump (1500/sec), pipe degradation by length, underground pipes, bottleneck detection

### Persistence
- **Auto-save** to localStorage (debounced 1s, restores on page load)
- **Named save slots** — save and load multiple factory designs
- **JSON export/import** — download and upload factory files

### Datasets
- **Factorio 2.0** — base game recipes and machines
- **Space Age** — expansion with new machines (Foundry, Recycler, Biochamber, Electromagnetic Plant, Cryogenic Plant, Biolab, Heating Tower, Crusher, Big Mining Drill) and Turbo transport belt

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Remove selected machine or belt |
| `R` | Rotate selected machine |
| `Ctrl+D` | Duplicate selected machine (with recipe + modules) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Escape` | Cancel pending action |
| `Ctrl+S` | Save (auto-saved automatically) |

## Tech Stack

- React 18 + TypeScript + Vite
- Konva.js (react-konva) for 2D canvas rendering
- Zustand for state management
- Tailwind CSS for styling
- Vitest + React Testing Library for testing (40 tests)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build      # produces dist/ (542KB JS, 164KB gzipped)
npm run preview    # preview production build
```

## Testing

```bash
npm test           # 40 tests across 5 test files
```

## How It Works

1. **Place machines** — Click a machine in the left palette, then click the canvas to place it
2. **Assign recipes** — Select a machine, then pick a recipe from the inspector
3. **Add modules** — If the machine has module slots, select modules from the dropdowns
4. **Connect with belts** — Click a green output port, then click a red input port on another machine
5. **Watch the flow** — The solver computes throughput and shows items/sec on belts, utilization bars, and warnings

### Port Layout
- **Top/Right ports** = output (green)
- **Bottom/Left ports** = input (red)

### Flow Solver Algorithm
The solver uses an iterative fixpoint algorithm:
1. Start all machines with recipes at 100% utilization (0% if no recipe)
2. Compute each machine's output rate = (recipe output qty / craft time) × machine speed × module speed bonus × module productivity bonus
3. Distribute outputs across connected belts (split evenly among targets that need each item, capped by belt capacity)
4. At each consuming machine, check if incoming supply meets max demand
5. If supply < demand, scale down the consumer's utilization
6. Repeat until stable (max 50 iterations)

Power = base usage × utilization × module consumption modifier.

## Project Structure

```
factorio-modeler/
├── src/
│   ├── components/        # React UI components
│   │   ├── EditorLayout.tsx
│   │   ├── MachinePalette.tsx
│   │   ├── FactoryCanvas.tsx
│   │   ├── Inspector.tsx
│   │   ├── Toolbar.tsx
│   │   ├── IconSprite.tsx
│   │   └── ErrorBoundary.tsx
│   ├── store/             # Zustand state management
│   │   ├── editorStore.ts
│   │   └── persistence.ts
│   ├── solver/            # Flow simulation engine
│   │   ├── flowSolver.ts
│   │   ├── inserterModel.ts
│   │   ├── moduleEffect.ts
│   │   └── pipeFlow.ts
│   ├── data/              # Factorio data types and loader
│   ├── hooks/             # Custom React hooks
│   ├── types/             # Connection type definitions
│   └── App.tsx
├── public/data/           # Factorio recipe/machine JSON data
├── .github/workflows/     # GitHub Pages deploy CI
└── package.json
```

## License

MIT