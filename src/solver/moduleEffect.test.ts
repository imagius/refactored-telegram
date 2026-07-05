import { describe, it, expect } from 'vitest';
import { sumModuleEffects, calculateEffectiveSpeed, calculateEffectiveProductivity, calculateEffectivePower } from './moduleEffect';
import type { Item } from '../data/types';

const speedModule3: Item = {
  id: 'speed-module-3', name: 'Speed module 3', category: 'production', stack: 50,
  module: { speed: 0.5, consumption: 0.7, pollution: 0.15 },
};

const prodModule3: Item = {
  id: 'productivity-module-3', name: 'Productivity module 3', category: 'production', stack: 50,
  module: { speed: -0.15, productivity: 0.1, consumption: 0.8, pollution: 0.1 },
};

const beacon: Item = {
  id: 'beacon', name: 'Beacon', category: 'production', stack: 20,
  beacon: { effectivity: 1.5, modules: 2, range: 3, type: 'electric', usage: 480 },
};

describe('moduleEffect', () => {
  it('sums module effects correctly', () => {
    const effects = sumModuleEffects([speedModule3, speedModule3]);
    expect(effects.speedBonus).toBe(1.0);  // 0.5 + 0.5
    expect(effects.consumptionBonus).toBe(1.4);  // 0.7 + 0.7
  });

  it('handles empty module list', () => {
    const effects = sumModuleEffects([]);
    expect(effects.speedBonus).toBe(0);
    expect(effects.productivityBonus).toBe(0);
  });

  it('handles undefined modules', () => {
    const effects = sumModuleEffects([undefined, undefined]);
    expect(effects.speedBonus).toBe(0);
  });

  it('calculates effective speed with modules only', () => {
    const effects = sumModuleEffects([speedModule3, speedModule3]);
    const speed = calculateEffectiveSpeed(effects, undefined, undefined, 0);
    // 1 + 1.0 = 2.0
    expect(speed).toBeCloseTo(2.0, 2);
  });

  it('calculates effective speed with beacons', () => {
    const effects = sumModuleEffects([speedModule3]);  // 0.5 speed
    // 2 beacons, each with 1 speed module 3 (0.5 speed), effectivity 1.5
    // beacon contribution: 0.5 * 1.5 * 2 = 1.5
    // total: 1 + 0.5 + 1.5 = 3.0
    const speed = calculateEffectiveSpeed(effects, speedModule3, beacon.beacon, 2);
    expect(speed).toBeCloseTo(3.0, 2);
  });

  it('productivity module reduces speed', () => {
    const effects = sumModuleEffects([prodModule3]);
    const speed = calculateEffectiveSpeed(effects, undefined, undefined, 0);
    // 1 + (-0.15) = 0.85
    expect(speed).toBeCloseTo(0.85, 2);
  });

  it('calculates effective productivity', () => {
    const effects = sumModuleEffects([prodModule3, prodModule3]);
    const prod = calculateEffectiveProductivity(effects);
    // 1 + 0.1 + 0.1 = 1.2
    expect(prod).toBeCloseTo(1.2, 2);
  });

  it('calculates effective power with modules', () => {
    const effects = sumModuleEffects([speedModule3, speedModule3]);
    const power = calculateEffectivePower(375, effects, undefined, undefined, 0);
    // 375 * (1 + 1.4) = 375 * 2.4 = 900
    expect(power).toBeCloseTo(900, 0);
  });

  it('calculates effective power with beacons', () => {
    const effects = sumModuleEffects([speedModule3]);
    // beacon power: speed module 3 has consumption 0.7
    // beacon contribution: 0.7 * 1.5 * 2 = 2.1
    // total multiplier: 1 + 0.7 + 2.1 = 3.8
    // power: 375 * 3.8 = 1425
    const power = calculateEffectivePower(375, effects, speedModule3, beacon.beacon, 2);
    expect(power).toBeCloseTo(1425, 0);
  });

  it('effective speed has minimum of 0.2', () => {
    const effects = sumModuleEffects([{ id: 'x', name: 'x', category: 'p', module: { speed: -2 } } as Item]);
    const speed = calculateEffectiveSpeed(effects, undefined, undefined, 0);
    expect(speed).toBe(0.2);
  });
});