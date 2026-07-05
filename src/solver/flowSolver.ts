// Flow solver: given a factory graph (machines + recipes + connections + splitters),
// compute items/sec through every belt and each machine's utilization.

import type { FactorioData, Recipe, Item } from '../data/types';
import type { Connection } from '../types/connections';
import type { PlacedMachine, PlacedSplitter } from '../store/editorStore';
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
  warnings: string[];
}

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
      power = basePower * util;
    }
    totalPower += power;

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
    warnings,
  };
}