# Factorio Modeler

A visual canvas-based factory modeler for Factorio — drag machines onto a canvas, connect them with belts and pipes, and the tool simulates item flow, calculates throughput, and flags bottlenecks.

Inspired by [Satisfactory Modeler](https://store.steampowered.com/app/3187030/Satisfactory_Modeler/) on Steam, adapted for Factorio's mechanics: inserters, two-lane belts, splitters with priority/filter, fluid pipes, modules/beacons, and power grid.

## Features

- **Visual canvas editor** — drag machines, connect with belts via port-to-port clicking, pan/zoom
- **Flow solver** — iterative fixpoint algorithm computes items/sec through every belt, machine utilization (0-100%), and bottleneck detection
- **Real Factorio data** — recipes, machines, belt speeds, inserter specs from Factorio 2.0 and Space Age (via [FactorioLab](https://github.com/factoriolab/factoriolab) data)
- **Splitters & mergers** — placeable logistics nodes with flow routing
- **Inserter throughput model** — calculates inserter count needed for any belt flow
- **Module & beacon effects** — speed/productivity/consumption bonuses, beacon effectivity × count
- **Fluid pipe model** — pump throughput, pipe degradation by length, underground pipes
- **Save/load** — auto-save to localStorage, named save slots, JSON export/import
- **Keyboard shortcuts** — Delete, R (rotate), ESC (cancel), Ctrl+S
- **Space Age support** — switch between Factorio 2.0 and Space Age datasets (includes new machines: Foundry, Recycler, Biochamber, Electromagnetic Plant, Cryogenic Plant, Biolab, etc.)

## Tech Stack

- React 18 + TypeScript + Vite
- Konva.js (react-konva) for 2D canvas rendering
- Zustand for state management
- Tailwind CSS for styling
- Vitest + React Testing Library for testing

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build      # produces dist/
npm run preview    # preview production build
```

## Testing

```bash
npm test           # run all tests
```

## How It Works

1. **Place machines** — Click a machine in the left palette, then click the canvas to place it
2. **Assign recipes** — Select a machine, then pick a recipe from the inspector panel
3. **Connect with belts** — Click a green output port on one machine, then click a red input port on another
4. **Watch the flow** — The solver automatically computes throughput and shows items/sec on belts, utilization bars on machines, and bottleneck warnings

### Port Layout
- **Top/Right ports** = output (green)
- **Bottom/Left ports** = input (red)

### Flow Solver
The solver uses an iterative fixpoint algorithm:
1. Start all machines with recipes at 100% utilization
2. Compute each machine's output rate (recipe output / craft time × machine speed)
3. Distribute outputs across connected belts (split evenly among targets that need each item)
4. At each consuming machine, check if incoming supply meets demand
5. If supply < demand, scale down the consumer's utilization
6. Repeat until stable (max 50 iterations)

Belt capacity is enforced — if a belt can't carry the flow, it's capped and flagged as a bottleneck (red).

## License

MIT