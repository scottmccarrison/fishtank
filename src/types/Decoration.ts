/** Static decoration definition (e.g., coral, seashell). */
export interface DecorationSpecies {
  /** Stable identifier, kebab-case. */
  id: string;
  /** Display name. */
  name: string;
  /** Cost in coins. */
  cost: number;
  /** Path relative to public/, e.g. "assets/decorations/Coral.png". */
  assetPath: string;
}
// DecorationInstance was removed in Phase 2.A WS4 - per-instance placement
// replaced by per-biome decorations[] string array in SaveStateV2.
