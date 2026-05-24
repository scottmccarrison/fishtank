/** Static definition of a fish species - one entry per unique creature. */
export interface FishSpecies {
  /** Stable identifier, kebab-case, used in save state. */
  id: string;
  /** Display name shown in shop and collection log. */
  name: string;
  /** Which biome this fish belongs to (matches Biome.id). */
  biomeId: string;
  /** Position in the biome's purchase order (0-indexed). Determines cost via CONSTANTS. */
  costIndex: number;
  /** Earn-rate baseline at purchase time, coins/second. Per-instance rate scales with biome and costIndex. */
  earnRateBase: number;
  /** Render scale multiplier (1.0 = native pixel size). Larger fish in later tiers visually communicate progression. */
  scale: number;
  /**
   * Path relative to public/, e.g. "assets/fish/saltwater/Clownfish.png".
   * Vite serves public/ at the base URL (`/fish/` in production). Loaders must
   * prefix `import.meta.env.BASE_URL` before passing to Phaser. The leading
   * slash is intentionally omitted so the prefix is unambiguous.
   */
  assetPath: string;
}

/** Render-only fish in the diorama. NOT persisted. One per owned species with count > 0. */
export interface DisplayFish {
  speciesId: string;
  x: number;
  y: number;
  direction: 1 | -1;
}
