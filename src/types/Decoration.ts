/** Static decoration definition (e.g., coral, seashell). */
export interface DecorationSpecies {
  /** Stable identifier, kebab-case. */
  id: string;
  /** Display name. */
  name: string;
  /** Cost in coins (= cost to upgrade INTO this tier). */
  cost: number;
  /** Path relative to public/, e.g. "assets/decorations/Coral.png". */
  assetPath: string;
  /** Per-decoration display scale multiplier (PR2 bakes per-item values). */
  renderScale: number;
}
// Per-instance placement was removed; decorations are placed via fixed slots
// (see decorationSlots.ts) with the per-biome current tier stored in
// SaveStateV2's BiomeTankState.slotTiers.
