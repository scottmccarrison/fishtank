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

/** Owned fish instance in the player's tank. Many can exist per species. */
export interface FishInstance {
  /** Unique instance ID (UUID v4). */
  id: string;
  /** References FishSpecies.id. */
  speciesId: string;
  /** Current x in tank coords. */
  x: number;
  /** Current y in tank coords. */
  y: number;
  /** 1 = swimming right, -1 = swimming left. */
  direction: 1 | -1;
  /** ISO timestamp of purchase. */
  ownedAt: string;
}
