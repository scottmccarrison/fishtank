export interface BiomeTankState {
  /** Owned fish counts in this biome, keyed by speciesId. */
  fishCounts: Record<string, number>;
  /**
   * Current upgrade tier per decoration slot, keyed by slotId.
   * 0 (or absent) = empty slot. Absent slots are treated as tier 0 defensively
   * so old saves without slotTiers still load correctly.
   */
  slotTiers: Record<string, number>;
}

export interface SaveStateV2 {
  version: 2;
  /** ISO timestamp of last save (used for offline-catchup math). */
  lastSavedAt: string;
  /** Current coin balance. */
  coinBalance: number;
  /** Lifetime coins earned (for stats/achievements). */
  lifetimeEarned: number;
  /** Per-biome tank state, keyed by biome id. */
  tanks: Record<string, BiomeTankState>;
}
