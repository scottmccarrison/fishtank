/** A biome groups fish species and gates progression. */
export interface Biome {
  /** Stable identifier, e.g. "tide-pool". */
  id: string;
  /** Display name. */
  name: string;
  /** Species in this biome, in purchase order. */
  fishSpeciesIds: string[];
  /** Cost (in coins) of the first fish in this biome. Implicit unlock gate per ADR-0005. */
  unlockThreshold: number;
  /** Background gradient top color, hex string. */
  gradientFrom: string;
  /** Background gradient bottom color, hex string. */
  gradientTo: string;
}
