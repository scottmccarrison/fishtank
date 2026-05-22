/** Static decoration definition (e.g., coral, seashell). */
export interface DecorationSpecies {
  /** Stable identifier, kebab-case. */
  id: string;
  /** Display name. */
  name: string;
  /** Path relative to public/, e.g. "assets/decorations/Coral.png". */
  assetPath: string;
}

/** Player-placed decoration instance. */
export interface DecorationInstance {
  /** Unique instance ID (UUID v4). */
  id: string;
  /** References DecorationSpecies.id. */
  speciesId: string;
  /** Placement x in tank coords. */
  x: number;
  /** Placement y in tank coords. */
  y: number;
  /** ISO timestamp of placement. */
  placedAt: string;
}
