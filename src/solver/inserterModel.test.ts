import { describe, it, expect } from 'vitest';
import { getInserterThroughput, calculateInsertersNeeded, getInserters } from './inserterModel';
import type { Item } from '../data/types';

const testInserters: Item[] = [
  { id: 'burner-inserter', name: 'Burner inserter', category: 'logistics', stack: 50, inserter: { speed: '5400/19' } },
  { id: 'inserter', name: 'Inserter', category: 'logistics', stack: 50, inserter: { speed: '2160/7' } },
  { id: 'fast-inserter', name: 'Fast inserter', category: 'logistics', stack: 50, inserter: { speed: '900' } },
  { id: 'bulk-inserter', name: 'Bulk inserter', category: 'logistics', stack: 50, inserter: { speed: '900', category: 'bulk' } },
];

describe('inserterModel', () => {
  it('parses fraction speed strings correctly', () => {
    // 5400/19 ≈ 284.2 swings/min → /60 = 4.74 swings/sec → *1 = 4.74 items/sec
    const throughput = getInserterThroughput(testInserters[0], 1);
    expect(throughput).toBeCloseTo(284.21 / 60, 2);
  });

  it('parses integer speed strings correctly', () => {
    // 900 swings/min → /60 = 15 swings/sec → *1 = 15 items/sec
    const throughput = getInserterThroughput(testInserters[2], 1);
    expect(throughput).toBeCloseTo(15, 1);
  });

  it('stack size multiplies throughput', () => {
    const t1 = getInserterThroughput(testInserters[2], 1);
    const t2 = getInserterThroughput(testInserters[2], 2);
    expect(t2).toBeCloseTo(t1 * 2, 1);
  });

  it('calculates correct inserter count for a flow rate', () => {
    // Fast inserter at stack 1: ~15 items/sec
    // Need 30 items/sec → 2 inserters
    const result = calculateInsertersNeeded(testInserters[2], 30, 1);
    expect(result.count).toBe(2);
  });

  it('returns 0 for zero flow', () => {
    const result = calculateInsertersNeeded(testInserters[2], 0, 1);
    expect(result.count).toBe(0);
  });

  it('returns at least 1 inserter for any positive flow', () => {
    const result = calculateInsertersNeeded(testInserters[2], 0.5, 1);
    expect(result.count).toBe(1);
  });

  it('getInserters returns all inserters sorted by speed descending', () => {
    const sorted = getInserters(testInserters);
    expect(sorted[0].id).toBe('fast-inserter'); // 900/min (tied with bulk)
    expect(sorted.length).toBe(4);
  });
});