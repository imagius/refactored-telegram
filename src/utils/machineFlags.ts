// Helper functions to determine machine capabilities

/** Machine IDs known to handle fluids (have dedicated fluid ports in Factorio) */
const FLUID_MACHINE_IDS = new Set([
  'oil-refinery',
  'chemical-plant',
  'pumpjack',
  'offshore-pump',
  'boiler',
  'heat-exchanger',
  'nuclear-reactor',
  'steam-engine',
  'steam-turbine',
]);

/** Returns true if this machine handles fluids */
export function isFluidMachine(machineId: string): boolean {
  return FLUID_MACHINE_IDS.has(machineId);
}
