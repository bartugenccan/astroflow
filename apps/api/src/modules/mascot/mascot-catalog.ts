/**
 * What Yıldız Tozu buys. Accessories are cosmetic layers on Aster (one per
 * slot); the streak shield is a consumable. Prices are server-authoritative.
 */

export type AccessorySlot = 'head' | 'neck' | 'hand' | 'aura';

export interface CatalogItem {
  id: string;
  kind: 'accessory' | 'shield';
  slot?: AccessorySlot;
  price: number;
  /** Aster must have reached this stage to buy it. */
  minStage: number;
}

export const CATALOG: readonly CatalogItem[] = [
  { id: 'bow', kind: 'accessory', slot: 'head', price: 80, minStage: 1 },
  { id: 'moonHat', kind: 'accessory', slot: 'head', price: 150, minStage: 1 },
  { id: 'starCrown', kind: 'accessory', slot: 'head', price: 400, minStage: 3 },
  { id: 'starScarf', kind: 'accessory', slot: 'neck', price: 120, minStage: 1 },
  { id: 'cometCape', kind: 'accessory', slot: 'neck', price: 350, minStage: 3 },
  { id: 'telescope', kind: 'accessory', slot: 'hand', price: 200, minStage: 2 },
  { id: 'crystal', kind: 'accessory', slot: 'hand', price: 260, minStage: 2 },
  { id: 'auraCandy', kind: 'accessory', slot: 'aura', price: 250, minStage: 2 },
  { id: 'auraMint', kind: 'accessory', slot: 'aura', price: 250, minStage: 2 },
  { id: 'auraNova', kind: 'accessory', slot: 'aura', price: 0, minStage: 5 },
  { id: 'shield', kind: 'shield', price: 200, minStage: 2 },
];

export function catalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((i) => i.id === id);
}
