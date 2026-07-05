// Flow solver: given a factory graph (machines + recipes + connections),
// compute items/sec through every belt and each machine's utilization.

import type { FactorioData, Recipe, Item } from '../data/types';
import type { Connection } from '../types/connections';
import type { PlacedMachine } from '../store/editorStore';

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
  data: FactorioData
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
      const speed = machineItem.machine.speed;
      // Output rate = (output qty / craft time) * crafting speed
      for (const [itemId, qty] of Object.entries(recipe.out)) {
        maxOutputs.set(itemId, (qty / recipe.time) * speed);
      }
      // Input rate = (input qty / craft time) * crafting speed
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
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let changed = false;

    // Compute actual outputs based on current utilization
    const actualOutputs = new Map<string, Map<string, number>>(); // nodeId → (itemId → items/sec)
    const actualInputs = new Map<string, Map<string, number>>();

    for (const node of nodes.values()) {
      const util = utilization.get(node.id) ?? 0;
      const outs = new Map<string, number>();
      const ins = new Map<string, number>();
      for (const [itemId, rate] of node.maxOutputs) {
        outs.set(itemId, rate * util);
      }
      for (const [itemId, rate] of node.requiredInputs) {
        ins.set(itemId, rate * util);
      }
      actualOutputs.set(node.id, outs);
      actualInputs.set(node.id, ins);
    }

    // For each machine, check if inputs are satisfied
    for (const node of nodes.values()) {
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
              if (targetNode?.requiredInputs.has(itemId)) {
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

    // Power = base usage * utilization (simplified: no recipe = 0 power)
    const power = machineProps?.usage && recipe ? machineProps.usage * util : 0;
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
    if (!sourceNode || !sourceNode.recipe) {
      connectionResults[edge.connection.id] = {
        connectionId: edge.connection.id,
        itemsPerSec: 0,
        itemIds: [],
        bottlenecked: false,
        beltCapacity: edge.capacity,
      };
      continue;
    }

    const sourceUtil = utilization.get(edge.fromId) ?? 0;
    const sourceOutEdges = outgoing.get(edge.fromId) ?? [];

    // Sum all items flowing on this edge
    let totalFlow = 0;
    const itemIds: string[] = [];

    for (const [itemId, maxRate] of sourceNode.maxOutputs) {
      const actualRate = maxRate * sourceUtil;
      if (actualRate <= 0) continue;

      // Count how many outgoing edges carry this item
      let relevantEdges = 0;
      for (const oe of sourceOutEdges) {
        const targetNode = nodes.get(oe.toId);
        if (targetNode?.requiredInputs.has(itemId)) {
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