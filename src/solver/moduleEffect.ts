// Module and beacon effect calculator
// Computes how modules and beacons modify machine speed, productivity, and power.

import type { Item, BeaconProps } from '../data/types';

export interface ModuleEffects {
  speedBonus: number;        // additive, e.g., 0.5 = +50% speed
  productivityBonus: number; // additive
  consumptionBonus: number;  // additive power change
  pollutionBonus: number;    // additive
  qualityBonus: number;      // additive
}

/**
 * Sum the effects of all modules in a machine's module slots.
 */
export function sumModuleEffects(modules: (Item | undefined)[]): ModuleEffects {
  const effects: ModuleEffects = {
    speedBonus: 0,
    productivityBonus: 0,
    consumptionBonus: 0,
    pollutionBonus: 0,
    qualityBonus: 0,
  };

  for (const mod of modules) {
    if (!mod?.module) continue;
    const m = mod.module;
    effects.speedBonus += m.speed ?? 0;
    effects.productivityBonus += m.productivity ?? 0;
    effects.consumptionBonus += m.consumption ?? 0;
    effects.pollutionBonus += m.pollution ?? 0;
    effects.qualityBonus += m.quality ?? 0;
  }

  return effects;
}

/**
 * Calculate the effective speed multiplier for a machine with modules and beacons.
 *
 * effective_speed = 1 + module_speed_bonus + (beacon_speed_bonus * beacon_effectivity * beacon_count)
 *
 * Factorio caps speed bonus at +20x (but we don't enforce that here).
 */
export function calculateEffectiveSpeed(
  moduleEffects: ModuleEffects,
  beaconModule: Item | undefined,
  beaconProps: BeaconProps | undefined,
  beaconCount: number,
): number {
  let speed = 1 + moduleEffects.speedBonus;

  if (beaconModule?.module && beaconProps) {
    const beaconSpeedBonus = beaconModule.module.speed ?? 0;
    const beaconEffect = beaconSpeedBonus * beaconProps.effectivity * beaconCount;
    speed += beaconEffect;
  }

  return Math.max(0.2, speed);  // minimum 20% speed
}

/**
 * Calculate the effective productivity multiplier.
 * Productivity from modules (not from beacons in vanilla Factorio).
 */
export function calculateEffectiveProductivity(moduleEffects: ModuleEffects): number {
  return 1 + moduleEffects.productivityBonus;
}

/**
 * Calculate the effective power usage.
 *
 * effective_power = base_power * (1 + module_consumption_bonus + beacon_consumption_bonus * beacon_effectivity * beacon_count)
 */
export function calculateEffectivePower(
  basePower: number,
  moduleEffects: ModuleEffects,
  beaconModule: Item | undefined,
  beaconProps: BeaconProps | undefined,
  beaconCount: number,
): number {
  let powerMultiplier = 1 + moduleEffects.consumptionBonus;

  if (beaconModule?.module && beaconProps) {
    const beaconConsumption = beaconModule.module.consumption ?? 0;
    powerMultiplier += beaconConsumption * beaconProps.effectivity * beaconCount;
  }

  return basePower * powerMultiplier;
}