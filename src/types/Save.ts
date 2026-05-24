export interface BiomeTankState {
  /** Owned fish counts in this biome, keyed by speciesId. */
  fishCounts: Record<string, number>;
  /** Owned decoration species ids in this biome (one of each; cosmetic in A, functional in B). */
  decorations: string[];
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
