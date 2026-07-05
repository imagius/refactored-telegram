// Inserter throughput model
// Calculates how many items/sec an inserter can move between belts and machines.

import type { Item } from '../data/types';
import { parseInserterSpeed } from '../data/loader';

/**
 * Inserter throughput in items/sec.
 *
 * Inserter speed in Factorio is expressed as "swings per minute" at 60fps.
 * Each swing moves `stackSize` items.
 *
 * Throughput = (speed / 60) * stackSize  items/sec
 *
 * Stack size depends on:
 * - Base: 1 for regular inserters, 2 for bulk inserters (at default research)
 * - Stack inserter bonus from research (not modeled here — user can override)
 *
 * The speed value in the data can be a fraction string like "2160/7".
 */
export function getInserterThroughput(
  inserter: Item,
  stackSize: number = 1
): number {
  if (!inserter.inserter) return 0;

  const speed = parseInserterSpeed(inserter.inserter.speed);
  // speed is in "swings per minute" → convert to swings/sec
  const swingsPerSec = speed / 60;
  return swingsPerSec * stackSize;
}

/**
 * Calculate how many inserters are needed to handle a given flow rate.
 */
export function calculateInsertersNeeded(
  inserter: Item,
  flowRate: number,      // items/sec
  stackSize: number = 1
): { count: number; throughputPerInserter: number } {
  const throughputPerInserter = getInserterThroughput(inserter, stackSize);
  if (throughputPerInserter <= 0) return { count: 0, throughputPerInserter: 0 };

  const count = Math.ceil(flowRate / throughputPerInserter);
  return { count, throughputPerInserter };
}

/**
 * Get all inserter items from the data, sorted by throughput (fastest first).
 */
export function getInserters(items: Item[]): Item[] {
  return items
    .filter((i) => i.inserter !== undefined)
    .sort((a, b) => {
      const speedA = parseInserterSpeed(a.inserter!.speed);
      const speedB = parseInserterSpeed(b.inserter!.speed);
      return speedB - speedA;
    });
}