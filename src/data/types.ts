// TypeScript types for FactorioLab data format

export interface FactorioData {
  version: { base: string };
  categories: Category[];
  icons: Icon[];
  items: Item[];
  recipes: Recipe[];
  flags: string[];
  locations: Location[];
  defaults: Defaults;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface Icon {
  id: string;
  x: number;
  y: number;
  color: string;
}

export interface Location {
  id: string;
  name: string;
}

// Machine sub-object (inside items that have 'machine' property)
export interface MachineProps {
  speed: number;
  type?: string;
  fuelCategories?: string[];
  usage?: number;          // power usage in kW
  drain?: number;          // idle power drain in kW
  pollution?: number;
  modules?: number;        // module slots
  size?: [number, number]; // tiles [width, height]
  disallowedEffects?: string[];
  silo?: { parts: number; launch: number; buffered: boolean };
}

export interface ModuleProps {
  consumption?: number;
  speed?: number;
  productivity?: number;
  quality?: number;
  pollution?: number;
}

export interface BeaconProps {
  effectivity: number;
  modules: number;
  range: number;
  type: string;
  usage: number;
  disallowedEffects?: string[];
  size?: [number, number];
  profile?: number[];
}

export interface BeltProps {
  speed: number;  // items per second per lane
}

export interface PipeProps {
  speed: number;
}

export interface InserterProps {
  speed: string;    // can be a fraction string like "2160/7"
  category?: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  stack?: number;
  row?: number;
  rocketCapacity?: number;
  // Optional properties that make this item a machine, module, beacon, belt, pipe, or inserter
  machine?: MachineProps;
  module?: ModuleProps;
  beacon?: BeaconProps;
  belt?: BeltProps;
  pipe?: PipeProps;
  inserter?: InserterProps;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  row?: number;
  time: number;           // craft time in seconds
  producers?: string[];    // item ids of machines that can craft this
  in: Record<string, number>;   // item/fluid id → quantity
  out: Record<string, number>;  // item/fluid id → quantity
  disallowedEffects?: string[];
  catalyst?: Record<string, number>;
}

export interface Defaults {
  beacon?: string;
  belt?: string;
  fuelRank?: string[];
  cargoWagon?: string;
  fluidWagon?: string;
  pipe?: string;
  presets?: Preset[];
}

export interface Preset {
  id: number;
  label: string;
  belt?: string;
  machineRank?: string[];
  moduleRank?: string[];
  beacon?: string;
  beaconCount?: number;
  beaconModule?: string;
}

// Helper type guards
export function isMachine(item: Item): item is Item & { machine: MachineProps } {
  return item.machine !== undefined;
}

export function isBelt(item: Item): item is Item & { belt: BeltProps } {
  return item.belt !== undefined;
}

export function isInserter(item: Item): item is Item & { inserter: InserterProps } {
  return item.inserter !== undefined;
}

export function isModule(item: Item): item is Item & { module: ModuleProps } {
  return item.module !== undefined;
}

export function isBeacon(item: Item): item is Item & { beacon: BeaconProps } {
  return item.beacon !== undefined;
}

export function isPipe(item: Item): item is Item & { pipe: PipeProps } {
  return item.pipe !== undefined;
}