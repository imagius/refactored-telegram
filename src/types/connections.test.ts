import { describe, it, expect } from 'vitest';
import { getPortPosition, PORT_OFFSETS, PORT_COLORS, type ConnectionSide } from './connections';

describe('connections - PORT_OFFSETS', () => {
  it('has correct offsets for all four sides', () => {
    expect(PORT_OFFSETS.top).toEqual({ x: 0, y: -30 });
    expect(PORT_OFFSETS.right).toEqual({ x: 30, y: 0 });
    expect(PORT_OFFSETS.bottom).toEqual({ x: 0, y: 30 });
    expect(PORT_OFFSETS.left).toEqual({ x: -30, y: 0 });
  });
});

describe('connections - PORT_COLORS', () => {
  it('output ports are green', () => {
    expect(PORT_COLORS.output).toBe('#4ade80');
  });

  it('input ports are red', () => {
    expect(PORT_COLORS.input).toBe('#f87171');
  });
});

describe('connections - getPortPosition', () => {
  it('returns correct position for top port', () => {
    const pos = getPortPosition(100, 200, 'top');
    expect(pos).toEqual({ x: 100, y: 170 });
  });

  it('returns correct position for right port', () => {
    const pos = getPortPosition(100, 200, 'right');
    expect(pos).toEqual({ x: 130, y: 200 });
  });

  it('returns correct position for bottom port', () => {
    const pos = getPortPosition(100, 200, 'bottom');
    expect(pos).toEqual({ x: 100, y: 230 });
  });

  it('returns correct position for left port', () => {
    const pos = getPortPosition(100, 200, 'left');
    expect(pos).toEqual({ x: 70, y: 200 });
  });

  it('handles origin (0,0)', () => {
    const pos = getPortPosition(0, 0, 'top');
    expect(pos).toEqual({ x: 0, y: -30 });
  });

  it('handles negative coordinates', () => {
    const pos = getPortPosition(-100, -200, 'right');
    expect(pos).toEqual({ x: -70, y: -200 });
  });

  it('works with all sides at same machine position', () => {
    const sides: ConnectionSide[] = ['top', 'right', 'bottom', 'left'];
    const positions = sides.map((s) => getPortPosition(500, 500, s));
    // Top and bottom share x, right and left share y
    expect(positions[0].x).toBe(positions[2].x); // top.x === bottom.x
    expect(positions[1].y).toBe(positions[3].y); // right.y === left.y
    // Top is above, bottom is below
    expect(positions[0].y).toBeLessThan(positions[2].y);
    // Left is left of right
    expect(positions[3].x).toBeLessThan(positions[1].x);
  });
});