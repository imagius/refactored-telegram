// Flow solver: given a factory graph (machines + recipes + connections + splitters),
// compute items/sec through every belt and each machine's utilization.

import type { FactorioData, Recipe, Item } from '../data/types';
import type { Connection } from '../types/connections';
import type { PlacedMachine, PlacedSplitter, PlacedBeacon } from '../store/editorStore';
import { sumModuleEffects, calculateEffectiveSpeed, calculateEffectiveProductivity, calculateEffectivePower } from './moduleEffect';

export interface MachineFlowResult {
  machineId: string;       // instance id
  recipeId?: string;
  utilization: number;     // 0-1 (fraction of max speed being used)
  inputs: Record<string, number>;   // item id → items/sec consumed
  outputs: Record<string, number>;  // item id → items/sec produced
  power: number;           // kW consumed
}

export interface ConnectionFlowResult {
  connectionId: string;
  itemsPerSec: number;
  itemIds: string[];       // which items are flowing on this belt
  bottlenecked: boolean;   // true if belt is at capacity
  beltCapacity: number;    // max items/sec the belt can carry
}

export interface FlowResult {
  machines: Record<string, MachineFlowResult>;
  connections: Record<string, ConnectionFlowResult>;
  totalPower: number;      // total kW
  totalPollution?: number; // total pollution/m
  totalUtilization?: number; // average utilization 0-1
  warnings: string[];
}

// Canvas pixel sizes (must match FactoryCanvas.tsx)
const MACHINE_SIZE_PX = 60;
const BEACON_SIZE_PX = 50;

// Build a graph representation from the factory state
interface GraphNode {
  id: string;
  machine: PlacedMachine;
  recipe?: Recipe;
  machineItem?: Item;
  // Computed: max output rate per item (items/sec at 100% utilization)
  maxOutputs: Map<string, number>;
  // Computed: required inputs per item (items/sec at 100% utilization)
  requiredInputs: Map<string, number>;
  // Splitter/merger fields
  isSplitter?: boolean;
  splitter?: PlacedSplitter;
  beltCapacity?: number;
}

interface GraphEdge {
  connection: Connection;
  fromId: string;
  toId: string;
  capacity: number;  // belt throughput (items/sec)
}

export function solveFlow(
  machines: PlacedMachine[],
  connections: Connection[],
  data: FactorioData,
  splitters: PlacedSplitter[] = [],
  beacons: PlacedBeacon[] = [],
): FlowResult {
  const warnings: string[] = [];
  const machineResults: Record<string, MachineFlowResult> = {};
  const connectionResults: Record<string, ConnectionFlowResult> = {};

  // Build nodes
  const nodes = new Map<string, GraphNode>();
  for (const m of machines) {
    const machineItem = data.items.find((i) => i.id === m.machineId);
    const recipe = m.recipeId ? data.recipes.find((r) => r.id === m.recipeId) : undefined;

    const maxOutputs = new Map<string, number>();
    const requiredInputs = new Map<string, number>();

    if (recipe && machineItem?.machine) {
      // Base speed from machine
      let speed = machineItem.machine.speed;

      // Apply module effects if machine has modules
      if (m.modules && m.modules.length > 0) {
        const moduleItems = m.modules
          .map((modId) => data.items.find((i) => i.id === modId))
          .filter(Boolean) as Item[];
        const effects = sumModuleEffects(moduleItems);
        const effectiveSpeedMul = calculateEffectiveSpeed(effects, undefined, undefined, 0);
        speed = speed * effectiveSpeedMul;
      }

      // Apply beacon effects — find all beacons within range of this machine
      const BEACON_TILE_TO_PX = 20; // 1 tile ≈ 20px (machine is 60px = 3 tiles)
      const machineCx = m.x + MACHINE_SIZE_PX / 2;
      const machineCy = m.y + MACHINE_SIZE_PX / 2;
      let beaconSpeedBonus = 0;
      let beaconConsumptionBonus = 0;
      let beaconPollutionBonus = 0;
      for (const b of beacons) {
        const beaconItem = data.items.find((i) => i.id === b.beaconId);
        const beaconProps = beaconItem?.beacon;
        if (!beaconProps || !b.moduleId) continue;
        const beaconModule = data.items.find((i) => i.id === b.moduleId);
        if (!beaconModule?.module) continue;
        const beaconCx = b.x + BEACON_SIZE_PX / 2;
        const beaconCy = b.y + BEACON_SIZE_PX / 2;
        const dist = Math.sqrt((machineCx - beaconCx) ** 2 + (machineCy - beaconCy) ** 2);
        const rangePx = beaconProps.range * BEACON_TILE_TO_PX;
        if (dist <= rangePx) {
          beaconSpeedBonus += (beaconModule.module.speed ?? 0) * beaconProps.effectivity;
          beaconConsumptionBonus += (beaconModule.module.consumption ?? 0) * beaconProps.effectivity;
          beaconPollutionBonus += (beaconModule.module.pollution ?? 0) * beaconProps.effectivity;
        }
      }

      if (beaconSpeedBonus !== 0) {
        speed = speed * (1 + beaconSpeedBonus);
      }

      // Productivity bonus increases output quantity
      let productivityMul = 1.0;
      if (m.modules && m.modules.length > 0) {
        const moduleItems = m.modules
          .map((modId) => data.items.find((i) => i.id === modId))
          .filter(Boolean) as Item[];
        const effects = sumModuleEffects(moduleItems);
        productivityMul = calculateEffectiveProductivity(effects);
      }

      // Output rate = (output qty / craft time) * crafting speed * productivity
      for (const [itemId, qty] of Object.entries(recipe.out)) {
        maxOutputs.set(itemId, (qty / recipe.time) * speed * productivityMul);
      }
      // Input rate = (input qty / craft time) * crafting speed (productivity doesn't increase input consumption)
      for (const [itemId, qty] of Object.entries(recipe.in)) {
        requiredInputs.set(itemId, (qty / recipe.time) * speed);
      }
    }

    nodes.set(m.id, {
      id: m.id,
      machine: m,
      recipe,
      machineItem,
      maxOutputs,
      requiredInputs,
    });
  }

  // Add splitter/merger nodes — they pass items through without consuming/producing
  for (const s of splitters) {
    const beltItem = s.beltId ? data.items.find((i) => i.id === s.beltId) : undefined;
    const beltCapacity = beltItem?.belt?.speed ?? 15;
    nodes.set(s.id, {
      id: s.id,
      machine: { id: s.id, machineId: s.id, x: s.x, y: s.y, rotation: s.rotation },  // stub
      recipe: undefined,
      machineItem: undefined,
      maxOutputs: new Map(),   // dynamic — computed from incoming flow
      requiredInputs: new Map(),  // splitters don't "require" specific items
      isSplitter: true,
      splitter: s,
      beltCapacity,
    });
  }

  // Build edges with belt capacity
  const edges: GraphEdge[] = [];
  for (const conn of connections) {
    const beltItem = conn.beltId ? data.items.find((i) => i.id === conn.beltId) : undefined;
    const capacity = beltItem?.belt?.speed ?? 15;  // default yellow belt
    edges.push({
      connection: conn,
      fromId: conn.fromMachineId,
      toId: conn.toMachineId,
      capacity,
    });
  }

  // Build adjacency: for each machine, what edges go OUT and what edges come IN
  const outgoing = new Map<string, GraphEdge[]>();
  const incoming = new Map<string, GraphEdge[]>();
  for (const node of nodes.values()) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const edge of edges) {
    if (outgoing.has(edge.fromId)) outgoing.get(edge.fromId)!.push(edge);
    if (incoming.has(edge.toId)) incoming.get(edge.toId)!.push(edge);
  }

  // Solver: iterative fixpoint
  // Start with all machines at 100% utilization
  // Solver: iterative fixpoint
  // Start with all machines at 100% utilization (if they have a recipe) or 0% (if no recipe)
  const utilization = new Map<string, number>();
  for (const node of nodes.values()) {
    utilization.set(node.id, node.recipe ? 1.0 : 0.0);
  }

  const MAX_ITERATIONS = 50;
  let actualOutputs = new Map<string, Map<string, number>>(); // nodeId → (itemId → items/sec)
  let actualInputs = new Map<string, Map<string, number>>();

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let changed = false;

    // Compute actual outputs based on current utilization
    actualOutputs = new Map<string, Map<string, number>>();
    actualInputs = new Map<string, Map<string, number>>();

    for (const node of nodes.values()) {
      const util = utilization.get(node.id) ?? 0;
      const outs = new Map<string, number>();
      const ins = new Map<string, number>();

      if (node.isSplitter) {
        // Splitters: compute outputs from incoming flow
        // Sum all incoming items from incoming edges
        const inEdges = incoming.get(node.id) ?? [];
        for (const edge of inEdges) {
          const sourceOutputs = actualOutputs.get(edge.fromId);
          if (!sourceOutputs) continue;
          const sourceOutEdges = outgoing.get(edge.fromId) ?? [];
          for (const [itemId, sourceRate] of sourceOutputs) {
            // How many outgoing edges from source carry this item to this splitter or other targets that need it?
            let relevantEdges = 0;
            for (const oe of sourceOutEdges) {
              const targetNode = nodes.get(oe.toId);
              if (targetNode?.requiredInputs.has(itemId) || (targetNode?.isSplitter)) {
                relevantEdges++;
              }
            }
            relevantEdges = Math.max(1, relevantEdges);
            const edgeFlow = Math.min(sourceRate / relevantEdges, edge.capacity);
            ins.set(itemId, (ins.get(itemId) ?? 0) + edgeFlow);
          }
        }
        // Splitter outputs = inputs (pass-through), split across outputs
        // Merger outputs = sum of inputs (pass-through)
        for (const [itemId, rate] of ins) {
          outs.set(itemId, rate);
        }
      } else {
        for (const [itemId, rate] of node.maxOutputs) {
          outs.set(itemId, rate * util);
        }
        for (const [itemId, rate] of node.requiredInputs) {
          ins.set(itemId, rate * util);
        }
      }

      actualOutputs.set(node.id, outs);
      actualInputs.set(node.id, ins);
    }

    // For each machine, check if inputs are satisfied
    for (const node of nodes.values()) {
      if (node.isSplitter) continue;  // splitters don't require specific items
      if (node.requiredInputs.size === 0) continue;  // no inputs needed (e.g., mining drill)

      const util = utilization.get(node.id) ?? 0;

      // Compute available input for each required item (at MAX demand, not scaled)
      // This prevents oscillation: if demand is 0.3125/sec and supply is 0, ratio = 0
      let minRatio = 1.0;
      for (const [itemId, maxRequiredRate] of node.requiredInputs) {
        // Sum capacity from incoming edges
        let availableRate = 0;
        const inEdges = incoming.get(node.id) ?? [];
        for (const edge of inEdges) {
          // Get the source machine's output of this item (at current util)
          const sourceOutputs = actualOutputs.get(edge.fromId);
          if (sourceOutputs && sourceOutputs.has(itemId)) {
            const sourceOutputRate = sourceOutputs.get(itemId)!;
            // Distribute source output across all outgoing edges from source that need this item
            const sourceOutEdges = outgoing.get(edge.fromId) ?? [];
            let relevantEdges = 0;
            for (const oe of sourceOutEdges) {
              const targetNode = nodes.get(oe.toId);
              if (targetNode?.requiredInputs.has(itemId) || targetNode?.isSplitter) {
                relevantEdges++;
              }
            }
            relevantEdges = Math.max(1, relevantEdges);
            // This edge's share of the source output, capped by belt capacity
            const edgeFlow = Math.min(sourceOutputRate / relevantEdges, edge.capacity);
            availableRate += edgeFlow;
          }
        }

        if (maxRequiredRate > 0) {
          const ratio = availableRate / maxRequiredRate;
          minRatio = Math.min(minRatio, ratio);
        }
      }

      // Scale utilization to match available inputs
      const newUtil = Math.min(1.0, minRatio);
      if (Math.abs(newUtil - util) > 0.001) {
        utilization.set(node.id, newUtil);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Compute final results
  let totalPower = 0;
  let totalPollution = 0;
  let utilSum = 0;
  let utilCount = 0;

  for (const node of nodes.values()) {
    const util = utilization.get(node.id) ?? 0;
    const recipe = node.recipe;
    const machineProps = node.machineItem?.machine;

    const inputs: Record<string, number> = {};
    const outputs: Record<string, number> = {};

    if (recipe) {
      for (const [itemId, rate] of node.requiredInputs) {
        inputs[itemId] = rate * util;
      }
      for (const [itemId, rate] of node.maxOutputs) {
        outputs[itemId] = rate * util;
      }
    }

    // Power = base usage * utilization * module consumption modifier
    let power = 0;
    if (machineProps?.usage && recipe) {
      let basePower = machineProps.usage;
      // Apply module power consumption effects
      if (node.machine.modules && node.machine.modules.length > 0) {
        const moduleItems = node.machine.modules
          .map((modId) => data.items.find((i) => i.id === modId))
          .filter(Boolean) as Item[];
        const effects = sumModuleEffects(moduleItems);
        basePower = calculateEffectivePower(basePower, effects, undefined, undefined, 0);
      }

      // Apply beacon power consumption bonus
      const machineCx = node.machine.x + MACHINE_SIZE_PX / 2;
      const machineCy = node.machine.y + MACHINE_SIZE_PX / 2;
      let beaconConsumptionBonus = 0;
      for (const b of beacons) {
        const beaconItem = data.items.find((i) => i.id === b.beaconId);
        const beaconProps = beaconItem?.beacon;
        if (!beaconProps || !b.moduleId) continue;
        const beaconModule = data.items.find((i) => i.id === b.moduleId);
        if (!beaconModule?.module) continue;
        const beaconCx = b.x + BEACON_SIZE_PX / 2;
        const beaconCy = b.y + BEACON_SIZE_PX / 2;
        const dist = Math.sqrt((machineCx - beaconCx) ** 2 + (machineCy - beaconCy) ** 2);
        const rangePx = beaconProps.range * 20;
        if (dist <= rangePx) {
          beaconConsumptionBonus += (beaconModule.module.consumption ?? 0) * beaconProps.effectivity;
        }
      }
      basePower = basePower * (1 + beaconConsumptionBonus);

      power = basePower * util;
    }
    totalPower += power;

    // Pollution = base pollution * utilization * module pollution modifier
    if (machineProps?.pollution && recipe) {
      let basePollution = machineProps.pollution;
      if (node.machine.modules && node.machine.modules.length > 0) {
        const moduleItems = node.machine.modules
          .map((modId) => data.items.find((i) => i.id === modId))
          .filter(Boolean) as Item[];
        const effects = sumModuleEffects(moduleItems);
        basePollution = basePollution * (1 + effects.pollutionBonus);
      }
      totalPollution += basePollution * util;
    }

    // Track utilization for average
    if (recipe) {
      utilSum += util;
      utilCount++;
    }

    machineResults[node.id] = {
      machineId: node.id,
      recipeId: recipe?.id,
      utilization: util,
      inputs,
      outputs,
      power,
    };

    // Check for machines with no recipe assigned
    if (!recipe && node.machineItem?.machine) {
      warnings.push(`${node.machineItem.name} has no recipe assigned`);
    }
  }

  // Add beacon power usage (beacons draw power regardless of utilization)
  for (const b of beacons) {
    const beaconItem = data.items.find((i) => i.id === b.beaconId);
    if (beaconItem?.beacon?.usage) {
      totalPower += beaconItem.beacon.usage;
    }
  }

  // Compute connection flows
  for (const edge of edges) {
    const sourceNode = nodes.get(edge.fromId);
    if (!sourceNode) {
      connectionResults[edge.connection.id] = {
        connectionId: edge.connection.id,
        itemsPerSec: 0,
        itemIds: [],
        bottlenecked: false,
        beltCapacity: edge.capacity,
      };
      continue;
    }

    // For splitter sources, use actualOutputs (computed from incoming flow)
    // For machine sources, use recipe outputs * utilization
    const sourceOutputs = actualOutputs.get(edge.fromId);
    const sourceOutEdges = outgoing.get(edge.fromId) ?? [];

    if (!sourceOutputs || (sourceOutputs.size === 0)) {
      connectionResults[edge.connection.id] = {
        connectionId: edge.connection.id,
        itemsPerSec: 0,
        itemIds: [],
        bottlenecked: false,
        beltCapacity: edge.capacity,
      };
      continue;
    }

    // Sum all items flowing on this edge
    let totalFlow = 0;
    const itemIds: string[] = [];

    for (const [itemId, actualRate] of sourceOutputs) {
      if (actualRate <= 0) continue;

      // Count how many outgoing edges carry this item
      let relevantEdges = 0;
      for (const oe of sourceOutEdges) {
        const targetNode = nodes.get(oe.toId);
        if (targetNode?.requiredInputs.has(itemId) || targetNode?.isSplitter) {
          relevantEdges++;
        }
      }
      relevantEdges = Math.max(1, relevantEdges);

      const edgeFlow = Math.min(actualRate / relevantEdges, edge.capacity);
      if (edgeFlow > 0) {
        totalFlow += edgeFlow;
        itemIds.push(itemId);
      }
    }

    const bottlenecked = totalFlow >= edge.capacity * 0.95;

    connectionResults[edge.connection.id] = {
      connectionId: edge.connection.id,
      itemsPerSec: totalFlow,
      itemIds,
      bottlenecked,
      beltCapacity: edge.capacity,
    };

    if (bottlenecked) {
      warnings.push(`Belt at capacity (${totalFlow.toFixed(1)}/${edge.capacity} items/sec)`);
    }
  }

  return {
    machines: machineResults,
    connections: connectionResults,
    totalPower,
    totalPollution,
    totalUtilization: utilCount > 0 ? utilSum / utilCount : 0,
    warnings,
  };
}