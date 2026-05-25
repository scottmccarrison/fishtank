import type { DisplayFish } from '../types/Fish.js';
import {
  moveCruiser,
  moveSchooler,
  moveRester,
  moveWalker,
  moveGlider,
  moveAmbusher,
  moveDrifter,
  movePredator,
  cohesion,
  separation,
  flee,
  DRIFT_SPEED,
  type AIState,
  type Bounds,
} from './behaviors.js';

function assertNever(x: never): never {
  throw new Error('unhandled behaviorType: ' + x);
}

export interface FishAIOptions {
  tankWidth: number;
  tankHeight: number;
  /** Px from each edge that fish cannot enter. Default 32. */
  margin?: number;
  /**
   * Optional upper swim bound (px from the top). Keeps fish below the waterline.
   * Omitted -> fish may rise to `margin`, preserving the original behavior.
   */
  surfaceTop?: number;
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
  private readonly surfaceTop?: number;
  private readonly rng: () => number;
  private readonly states = new Map<string, AIState>();
  private elapsedMs = 0;

  constructor(opts: FishAIOptions) {
    this.width = opts.tankWidth;
    this.height = opts.tankHeight;
    this.margin = opts.margin ?? DEFAULT_MARGIN;
    this.surfaceTop = opts.surfaceTop;
    this.rng = opts.rng ?? Math.random;
  }

  update(fish: DisplayFish[], dt: number): void {
    this.elapsedMs += dt;
    const bounds: Bounds = {
      width: this.width,
      height: this.height,
      margin: this.margin,
      top: this.surfaceTop,
    };

    // --- Pass 1: solo-move every fish (WS1 per-archetype dispatch) ---
    for (const f of fish) {
      const state = this.ensureState(f);

      switch (f.behaviorType) {
        case 'schooler':
          moveSchooler(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'cruiser':
          moveCruiser(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'drifter':
          moveDrifter(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'predator':
          movePredator(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'rester':
          moveRester(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'walker':
          moveWalker(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'glider':
          moveGlider(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        case 'ambusher':
          moveAmbusher(f, state, dt, this.elapsedMs, bounds, this.rng);
          break;
        default:
          assertNever(f.behaviorType);
      }
    }

    // --- Pass 2: inter-species interactions using post-move positions ---

    // Compute schooler centroid from post-move positions
    const schoolers = fish.filter(f => f.behaviorType === 'schooler');
    const predators = fish.filter(f => f.behaviorType === 'predator');
    const floorDwellers = fish.filter(
      f => f.behaviorType === 'rester' || f.behaviorType === 'walker' ||
           f.behaviorType === 'glider' || f.behaviorType === 'ambusher',
    );

    let centroid: { x: number; y: number } | null = null;
    if (schoolers.length > 0) {
      let sumX = 0;
      let sumY = 0;
      for (const s of schoolers) {
        sumX += s.x;
        sumY += s.y;
      }
      centroid = { x: sumX / schoolers.length, y: sumY / schoolers.length };
    }

    for (const f of fish) {
      const state = this.ensureState(f);

      // Flee: apply to all non-predators when predators are present
      if (f.behaviorType !== 'predator' && predators.length > 0) {
        flee(f, state, predators);
      }

      // Cohesion + separation: schoolers only, skip if already darting/fleeing.
      // Cohesion pulls toward the group; separation keeps spacing so they do not
      // collapse onto one point and superimpose.
      if (f.behaviorType === 'schooler' && state.dartMs <= 0) {
        if (centroid !== null && schoolers.length > 1) {
          const othersX = (centroid.x * schoolers.length - f.x) / (schoolers.length - 1);
          const othersY = (centroid.y * schoolers.length - f.y) / (schoolers.length - 1);
          cohesion(f, state, { x: othersX, y: othersY });
        }
        separation(f, schoolers);
      }

      // Floor separation: no cohesion, just push apart. Gated on dartMs <= 0
      // so separation does not fight an in-progress flee or ambush dart.
      if (
        (f.behaviorType === 'rester' || f.behaviorType === 'walker' ||
         f.behaviorType === 'glider' || f.behaviorType === 'ambusher') &&
        state.dartMs <= 0
      ) {
        separation(f, floorDwellers);
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
