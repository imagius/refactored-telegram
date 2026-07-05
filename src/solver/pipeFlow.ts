// Fluid pipe throughput model
// Simplified model of Factorio's fluid system.

/**
 * Pipe throughput in fluid/sec.
 *
 * Factorio's fluid system is pressure-based and complex. This is a simplified
 * steady-state model that gives good approximations for planning:
 *
 * - Pump-supported pipe: 1500 fluid/sec (practically unlimited)
 * - Pipe segment throughput degrades with length
 * - Underground pipes count as 1 segment regardless of distance
 * - Junctions (splits) reduce throughput
 *
 * The formula used is a common heuristic from the Factorio community:
 * throughput = base_throughput / (1 + length * degradation_factor)
 *
 * For pumps: constant 1500 fluid/sec
 * For pipes: 1500 / (1 + segments * 0.01) approximately
 */

const PUMP_THROUGHPUT = 1500;  // fluid/sec
const BASE_PIPE_THROUGHPUT = 1500;
const PIPE_DEGRADATION = 0.01;  // per segment

/**
 * Calculate pipe throughput for a given number of pipe segments.
 *
 * @param pipeType 'pump' or 'pipe' or 'pipe-to-ground'
 * @param segments Number of pipe segments (1 for pump, length for pipes)
 * @returns fluid/sec throughput
 */
export function calculatePipeFlow(
  pipeType: string,
  segments: number
): number {
  if (pipeType === 'pump') {
    return PUMP_THROUGHPUT;
  }

  if (pipeType === 'pipe-to-ground') {
    // Underground pipes count as 1 segment regardless of distance
    return BASE_PIPE_THROUGHPUT / (1 + 1 * PIPE_DEGRADATION);
  }

  // Regular pipe — throughput degrades with length
  return BASE_PIPE_THROUGHPUT / (1 + segments * PIPE_DEGRADATION);
}

/**
 * Calculate how many pipes/pumps are needed for a given fluid flow.
 *
 * @param pipeType 'pump' or 'pipe'
 * @param segments Number of pipe segments
 * @param flowRate Required fluid/sec
 * @returns { count: number, throughput: number }
 */
export function calculatePipesNeeded(
  pipeType: string,
  segments: number,
  flowRate: number
): { count: number; throughput: number } {
  const throughput = calculatePipeFlow(pipeType, segments);
  if (throughput <= 0) return { count: 0, throughput: 0 };

  // For pumps, you need ceil(flow / 1500) pumps
  // For pipes, you typically need 1 pipe line (just check if it can handle the flow)
  if (pipeType === 'pump') {
    return {
      count: Math.ceil(flowRate / PUMP_THROUGHPUT),
      throughput: PUMP_THROUGHPUT,
    };
  }

  // For pipes, 1 line if throughput >= flow, otherwise you need parallel lines
  const count = throughput >= flowRate ? 1 : Math.ceil(flowRate / throughput);
  return { count, throughput };
}

/**
 * Check if a pipe connection is bottlenecked.
 */
export function isPipeBottlenecked(
  pipeType: string,
  segments: number,
  flowRate: number
): boolean {
  const throughput = calculatePipeFlow(pipeType, segments);
  return flowRate > throughput * 0.95;
}