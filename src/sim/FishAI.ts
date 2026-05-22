import type { FishInstance } from '../types/Fish.js';

export interface FishAIOptions {
  tankWidth: number;
  tankHeight: number;
  /** Px from each edge that fish cannot enter. Default 32. */
  margin?: number;
  /** Inject a deterministic RNG for tests. Defaults to Math.random. */
  rng?: () => number;
}

interface AIState {
  driftSpeed: number;
  wobblePhase: number;
  dartMs: number;
  dartVx: number;
  dartVy: number;
}

const DRIFT_SPEED = 20;
const WOBBLE_VEL_AMPLITUDE = 8;
const WOBBLE_PERIOD_MS = 4000;
const DART_PROB_PER_SEC = 0.025;
const DART_DURATION_MS = 800;
const DART_SPEED = 80;
const DEFAULT_MARGIN = 32;

/**
 * Fish swim AI. Mutates FishInstance.x/y/direction each tick.
 * AI state (dart phase, wobble offset) lives in an in-memory Map keyed by
 * instance id; it does NOT touch the save schema. Reloading resets dart state.
 *
 * All probabilities and velocities are dt-rate-independent: this class is safe
 * to call at any update frequency (5Hz sim or 60Hz render).
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

  update(instances: FishInstance[], dt: number): void {
    this.elapsedMs += dt;
    const dtSec = dt / 1000;

    for (const fish of instances) {
      const state = this.ensureState(fish);

      if (state.dartMs > 0) {
        fish.x += state.dartVx * dtSec;
        fish.y += state.dartVy * dtSec;
        state.dartMs -= dt;
        if (state.dartMs <= 0) {
          state.dartMs = 0;
          state.dartVx = 0;
          state.dartVy = 0;
        }
      } else {
        fish.x += state.driftSpeed * fish.direction * dtSec;

        const yVel =
          WOBBLE_VEL_AMPLITUDE *
          Math.sin(
            (2 * Math.PI * this.elapsedMs) / WOBBLE_PERIOD_MS + state.wobblePhase,
          );
        fish.y += yVel * dtSec;

        if (this.rng() < DART_PROB_PER_SEC * dtSec) {
          this.startDart(state, fish.direction);
        }
      }

      this.bounce(fish);
    }
  }

  private ensureState(fish: FishInstance): AIState {
    let s = this.states.get(fish.id);
    if (!s) {
      s = {
        driftSpeed: DRIFT_SPEED,
        wobblePhase: this.rng() * Math.PI * 2,
        dartMs: 0,
        dartVx: 0,
        dartVy: 0,
      };
      this.states.set(fish.id, s);
    }
    return s;
  }

  private startDart(state: AIState, direction: 1 | -1): void {
    const angle = -Math.PI / 4 + (this.rng() - 0.5) * Math.PI;
    state.dartMs = DART_DURATION_MS;
    state.dartVx = Math.cos(angle) * DART_SPEED * direction;
    state.dartVy = Math.sin(angle) * DART_SPEED;
  }

  private bounce(fish: FishInstance): void {
    if (fish.x < this.margin) {
      fish.x = this.margin;
      fish.direction = 1;
    } else if (fish.x > this.width - this.margin) {
      fish.x = this.width - this.margin;
      fish.direction = -1;
    }
    if (fish.y < this.margin) fish.y = this.margin;
    if (fish.y > this.height - this.margin) fish.y = this.height - this.margin;
  }
}
