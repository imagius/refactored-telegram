import { describe, it, expect } from 'vitest';
import { calculatePipeFlow, calculatePipesNeeded, isPipeBottlenecked } from './pipeFlow';

describe('pipeFlow', () => {
  it('pump handles 1500 fluid/sec', () => {
    expect(calculatePipeFlow('pump', 1)).toBe(1500);
  });

  it('pump throughput is constant regardless of segments', () => {
    expect(calculatePipeFlow('pump', 100)).toBe(1500);
  });

  it('single pipe segment has near-max throughput', () => {
    const flow = calculatePipeFlow('pipe', 1);
    // 1500 / (1 + 0.01) ≈ 1485
    expect(flow).toBeCloseTo(1485, 0);
  });

  it('long pipe degrades throughput', () => {
    const flow = calculatePipeFlow('pipe', 100);
    // 1500 / (1 + 1) = 750
    expect(flow).toBe(750);
  });

  it('underground pipe counts as 1 segment', () => {
    const flow = calculatePipeFlow('pipe-to-ground', 20);
    // Same as 1 segment
    expect(flow).toBeCloseTo(calculatePipeFlow('pipe', 1), 2);
  });

  it('calculates pumps needed for high flow', () => {
    const result = calculatePipesNeeded('pump', 1, 3000);
    expect(result.count).toBe(2);  // 2 pumps for 3000 fluid/sec
  });

  it('calculates 1 pump for flow under 1500', () => {
    const result = calculatePipesNeeded('pump', 1, 1000);
    expect(result.count).toBe(1);
  });

  it('returns 0 for zero flow', () => {
    const result = calculatePipesNeeded('pipe', 10, 0);
    expect(result.count).toBe(1);  // 1 pipe can handle 0 flow
  });

  it('detects pipe bottleneck', () => {
    // 100 segments → 750/sec capacity
    expect(isPipeBottlenecked('pipe', 100, 800)).toBe(true);
  });

  it('no bottleneck when flow under capacity', () => {
    expect(isPipeBottlenecked('pipe', 10, 100)).toBe(false);
  });
});