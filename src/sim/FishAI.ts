import type { DisplayFish } from '../types/Fish.js';
import {
  moveCruiser,
  moveSchooler,
  moveBottomDweller,
  moveDrifter,
  movePredator,
  DRIFT_SPEED,
  type AIState,
  type Bounds,
} from './behaviors.js';

export interface FishAIOptions {
  tankWidth: number;
  tankHeight: number;
  /** Px from each edge that fish cannot enter. Default 32. */
  margin?: number;
  /** Inject a deterministic RNG for tests. Defaults to Math.random. */
  rng?: () => number;
}

const DEFAULT_MARGIN = 32;

/**
 * Fish swim AI. Mutates DisplayFish.x/y/direction each tick.
 * AI state (dart phase, wobble offset) lives in an in-memory Map keyed by
 * speciesId (one DisplayFish per species, so speciesId is unique within the array).
 * It does NOT touch the save schema. Reloading resets dart state.
 *
 * All probabilities and velocities are dt-rate-independent: this class is safe
 * to call at any update frequency (5Hz sim or 60Hz render).
 *
 * Dispatches to per-archetype functions in behaviors.ts based on fish.behaviorType.
 * Cruiser path is byte-identical to the original loop - FishAI.test.ts regression gate.
 */
export class FishAI {
  private readonly width: number;
  private readonly height: number;
  private readonly margin: number;
  private readonly rng: () => number;
  private readonly states = new Map<string, AIState>();
  private elapsedMs = 0;

  constructor(opts: FishAIOptions) {
    this.width = opts.tankWidth;
    this.height = opts.tankHeight;
    this.margin = opts.margin ?? DEFAULT_MARGIN;
    this.rng = opts.rng ?? Math.random;
  }

  update(fish: DisplayFish[], dt: number): void {
    this.elapsedMs += dt;
    const bounds: Bounds = { width: this.width, height: this.height, margin: this.margin };

    for (const f of fish) {
      const state = this.ensureState(f);

      switch (f.behaviorType) {
        case 'schooler':
          moveSchooler(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'bottom-dweller':
          moveBottomDweller(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'drifter':
          moveDrifter(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'predator':
          movePredator(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'cruiser':
        default:
          moveCruiser(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
      }
    }
  }

  private ensureState(fish: DisplayFish): AIState {
    let s = this.states.get(fish.speciesId);
    if (!s) {
      s = {
        driftSpeed: DRIFT_SPEED,
        wobblePhase: this.rng() * Math.PI * 2,
        dartMs: 0,
        dartVx: 0,
        dartVy: 0,
      };
      this.states.set(fish.speciesId, s);
    }
    return s;
  }
}
