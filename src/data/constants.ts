/**
 * Locked numeric model from ADR-0005 and sim parameters from ADR-0003.
 * Tuning happens here; every consumer reads from this object.
 */
export const CONSTANTS = {
  // --- Sim loop (ADR-0003) ---
  /** Sim tick rate in Hz. */
  SIM_TICK_HZ: 5,
  /** Sim tick interval in ms. */
  SIM_TICK_MS: 200,
  /** Maximum offline time we will credit (24h). */
  OFFLINE_CATCHUP_CAP_MS: 24 * 60 * 60 * 1000,

  // --- Save ---
  /** localStorage key for v2 save. */
  SAVE_KEY: 'fishtank.save.v2',
  /** Autosave cadence in ms. */
  AUTOSAVE_INTERVAL_MS: 10000,

  // --- Economy (ADR-0005) ---
  /** Cost of the very first fish, in coins. */
  FIRST_FISH_COST: 50,
  /** Multiplicative cost step between sequential fish within a biome. */
  COST_RATIO_IN_BIOME: 1.4,
  /** Multiplicative cost step at biome transitions. */
  BIOME_COST_STEP: 15,
  /** Multiplicative earn-rate step between sequential fish within a biome. */
  EARN_RATIO_IN_BIOME: 1.16,
  /** Multiplicative earn-rate step at biome transitions. */
  BIOME_EARN_STEP: 15,
  /** Target payback time at purchase, in seconds. */
  PAYBACK_SECONDS: 90,

  // --- Layout (Phase 2.A) - PORTRAIT ---
  /** Full canvas (portrait 9:16). */
  CANVAS_WIDTH: 450,
  CANVAS_HEIGHT: 800,
  /** Diorama occupies the top ~60%; fish motion is bounded here. */
  DIORAMA_HEIGHT: 480,
  /**
   * Y of the waterline. Water (the biome gradient) fills [WATER_SURFACE_Y, DIORAMA_HEIGHT];
   * the strip above is the air gap / glass top painted by TankGlass. Shared anchor so the
   * backdrop, the glass overlay, and the fish top-bound all agree.
   */
  WATER_SURFACE_Y: 48,
  /** Ledger occupies the bottom ~40%. */
  LEDGER_Y: 480,
  LEDGER_HEIGHT: 320,
  /** Fish/decoration sprite scale (promoted from TankScene; WS2/WS3 read it). */
  RENDER_SCALE_MULTIPLIER: 3,
  /**
   * Global "zoom" for tank contents (fish + decorations), applied on top of their
   * individual scales. < 1 shrinks everything proportionally so the tank reads as a
   * larger body of water without changing the tank's dimensions. The layout editor
   * lets this be dialed live and bakes the chosen value here. Tunable.
   */
  CONTENT_SCALE: 0.75,
  /**
   * Decoration sprites render at this uniform scale. Brysia decoration art has
   * varied native sizes (16-80px), so a single multiplier preserves the artist's
   * relative proportions (castle big, shell small) while reading well next to the
   * fish (which use RENDER_SCALE_MULTIPLIER).
   */
  DECORATION_RENDER_SCALE: 2,
  /** Alpha of the subtle wavy water overlay rendered above the biome gradient (tunable). */
  WATER_TEXTURE_ALPHA: 0.1,
} as const;

/** Type alias for the constants object - allows precise typing of consumers. */
export type Constants = typeof CONSTANTS;
