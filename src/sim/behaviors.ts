/**
 * Pure per-archetype solo-motion functions.
 * No Phaser. No side effects beyond mutating the passed fish x/y/direction.
 * Each function signature: (fish, state, dt, elapsedMs, bounds, rng)
 * All velocity is dt-rate-independent (scaled by dtSec = dt / 1000).
 */

import type { DisplayFish } from '../types/Fish.js';

// Re-exported so FishAI can reference them without duplicating.
export const DRIFT_SPEED = 20;           // px/s - cruiser horizontal cruise
export const WOBBLE_VEL_AMPLITUDE = 8;   // px/s - vertical wobble amplitude
export const WOBBLE_PERIOD_MS = 4000;    // ms
export const DART_PROB_PER_SEC = 0.025;  // cruiser dart probability per second
export const DART_DURATION_MS = 800;     // ms
export const DART_SPEED = 80;            // px/s

// Floor behavior constants
export const BOTTOM_BAND = 120;          // px - floor species live in [DIORAMA_HEIGHT-120, DIORAMA_HEIGHT-margin]
export const WALKER_SPEED = 12;          // px/s - walker horizontal scuttle
export const GLIDER_SPEED = 10;          // px/s - glider horizontal cruise
export const GLIDER_BOB_AMP = 14;        // px/s - glider vertical undulation amplitude
export const GLIDER_BOB_PERIOD = 5000;   // ms - glider vertical undulation period
export const AMBUSHER_DART_PROB = 0.03;  // per second - ambusher dart trigger probability

// Drifter constants
export const DRIFTER_BOB_AMP = 10;       // px/s - vertical bob velocity amplitude
export const DRIFTER_BOB_PERIOD = 6000;  // ms
export const DRIFTER_DRIFT = 4;          // px/s - tiny horizontal so drifters still traverse and flip

// Predator constants
export const PREDATOR_SPEED = 12;        // px/s - slower than cruiser (DRIFT_SPEED 20)
export const PREDATOR_WOBBLE_AMP = 2;    // px/s - minimal wobble for predators

// Schooler constants
export const SCHOOLER_DART_PROB = 0.08;  // per second - twitchier than cruiser

// Interaction constants (WS2)
export const COHESION_GAIN = 0.5;    // steer strength toward centroid
export const COHESION_MAX_V = 6;     // px/s cap on cohesion velocity contribution
export const SEPARATION_RADIUS = 90; // px; schoolers/floor-dwellers closer than this push apart
export const SEPARATION_GAIN = 8;    // push strength (stronger than cohesion so it wins up close)
export const SEPARATION_MAX_V = 9;   // px cap on the per-tick separation nudge
export const FLEE_RADIUS = 120;      // px - prey within this distance of a predator flees
export const FLEE_SPEED = 100;       // px/s flee dart speed

// Diorama dimensions (matches CONSTANTS in data/constants.ts)
export const DIORAMA_HEIGHT = 480;

export interface AIState {
  driftSpeed: number;
  wobblePhase: number;
  dartMs: number;
  dartVx: number;
  dartVy: number;
}

export interface Bounds {
  width: number;
  height: number;
  margin: number;
  /**
   * Optional upper swim bound (px from canvas top). When set, fish cannot rise
   * above this line - used to keep them below the waterline. Defaults to `margin`
   * when omitted, so existing callers and the FishAI regression gate are unchanged.
   */
  top?: number;
  /**
   * Optional ground surface function: returns the y of the substrate at a given x.
   * When set, floor-dweller archetypes snap to the slope instead of the flat bottom.
   * When absent, behavior is byte-identical to today (bounds.height - bounds.margin),
   * so all existing tests stay green unchanged.
   */
  floorAt?: (x: number) => number;
}

/**
 * X-edge bounce: flip direction and clamp x when a fish hits the horizontal walls.
 * Used by all archetypes.
 */
export function bounceX(fish: DisplayFish, bounds: Bounds): void {
  if (fish.x < bounds.margin) {
    fish.x = bounds.margin;
    fish.direction = 1;
  } else if (fish.x > bounds.width - bounds.margin) {
    fish.x = bounds.width - bounds.margin;
    fish.direction = -1;
  }
}

/**
 * Generic y clamp - used by cruiser/schooler/predator.
 */
function clampY(fish: DisplayFish, bounds: Bounds): void {
  const top = bounds.top ?? bounds.margin;
  if (fish.y < top) fish.y = top;
  if (fish.y > bounds.height - bounds.margin) fish.y = bounds.height - bounds.margin;
}

/**
 * Arm a dart impulse on the state. Velocity is relative to current direction.
 */
export function startDart(state: AIState, direction: 1 | -1, rng: () => number): void {
  const angle = -Math.PI / 4 + (rng() - 0.5) * Math.PI;
  state.dartMs = DART_DURATION_MS;
  state.dartVx = Math.cos(angle) * DART_SPEED * direction;
  state.dartVy = Math.sin(angle) * DART_SPEED;
}

// ---------------------------------------------------------------------------
// Archetype: cruiser
// Byte-identical to the original FishAI update loop. This is the regression gate.
// ---------------------------------------------------------------------------
export function moveCruiser(
  fish: DisplayFish,
  state: AIState,
  dt: number,
  elapsedMs: number,
  bounds: Bounds,
  rng: () => number,
): void {
  const dtSec = dt / 1000;

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
      Math.sin((2 * Math.PI * elapsedMs) / WOBBLE_PERIOD_MS + state.wobblePhase);
    fish.y += yVel * dtSec;

    if (rng() < DART_PROB_PER_SEC * dtSec) {
      startDart(state, fish.direction, rng);
    }
  }

  bounceX(fish, bounds);
  clampY(fish, bounds);
}

// ---------------------------------------------------------------------------
// Archetype: schooler
// Like cruiser but dart probability is SCHOOLER_DART_PROB (twitchier).
// No cohesion yet - that is WS2.
// ---------------------------------------------------------------------------
export function moveSchooler(
  fish: DisplayFish,
  state: AIState,
  dt: number,
  elapsedMs: number,
  bounds: Bounds,
  rng: () => number,
): void {
  const dtSec = dt / 1000;

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
      Math.sin((2 * Math.PI * elapsedMs) / WOBBLE_PERIOD_MS + state.wobblePhase);
    fish.y += yVel * dtSec;

    if (rng() < SCHOOLER_DART_PROB * dtSec) {
      startDart(state, fish.direction, rng);
    }
  }

  bounceX(fish, bounds);
  clampY(fish, bounds);
}

// ---------------------------------------------------------------------------
// Floor helpers: snap to sand line or clamp within the bottom band.
// ---------------------------------------------------------------------------
export function snapToFloor(fish: DisplayFish, bounds: Bounds): void {
  fish.y = bounds.floorAt ? bounds.floorAt(fish.x) : (bounds.height - bounds.margin);
}

export function clampToBand(fish: DisplayFish, bounds: Bounds): void {
  const floorY = bounds.floorAt ? bounds.floorAt(fish.x) : (bounds.height - bounds.margin);
  const bandTop = floorY - (BOTTOM_BAND - bounds.margin);
  if (fish.y < bandTop) fish.y = bandTop;
  if (fish.y > floorY) fish.y = floorY;
}

// ---------------------------------------------------------------------------
// Archetype: rester (starfish)
// Sits on the sand. No horizontal movement, no dart.
// ---------------------------------------------------------------------------
export function moveRester(
  fish: DisplayFish,
  state: AIState,
  _dt: number,
  _elapsedMs: number,
  bounds: Bounds,
  _rng: () => number,
): void {
  snapToFloor(fish, bounds);

  // No horizontal movement
  state.dartMs = 0;
  state.dartVx = 0;
  state.dartVy = 0;

  bounceX(fish, bounds);
}

// ---------------------------------------------------------------------------
// Archetype: walker (crabs, shrimp)
// Scuttles along the sand at WALKER_SPEED. No dart.
// ---------------------------------------------------------------------------
export function moveWalker(
  fish: DisplayFish,
  state: AIState,
  dt: number,
  _elapsedMs: number,
  bounds: Bounds,
  _rng: () => number,
): void {
  const dtSec = dt / 1000;

  fish.x += WALKER_SPEED * fish.direction * dtSec;
  snapToFloor(fish, bounds);

  state.dartMs = 0;
  state.dartVx = 0;
  state.dartVy = 0;

  bounceX(fish, bounds);
}

// ---------------------------------------------------------------------------
// Archetype: glider (stingray)
// Glides horizontally just above the sand with a vertical undulation.
// Stays within [BAND_TOP, floorY]. No dart.
// ---------------------------------------------------------------------------
export function moveGlider(
  fish: DisplayFish,
  state: AIState,
  dt: number,
  elapsedMs: number,
  bounds: Bounds,
  _rng: () => number,
): void {
  const dtSec = dt / 1000;

  fish.x += GLIDER_SPEED * fish.direction * dtSec;

  // Vertical undulation using wobblePhase (seeded per fish in ensureState)
  fish.y += GLIDER_BOB_AMP * Math.sin((2 * Math.PI * elapsedMs) / GLIDER_BOB_PERIOD + state.wobblePhase) * dtSec;
  clampToBand(fish, bounds);

  state.dartMs = 0;
  state.dartVx = 0;
  state.dartVy = 0;

  bounceX(fish, bounds);
}

// ---------------------------------------------------------------------------
// Archetype: ambusher (flounder)
// Rests flat on the sand; occasionally darts, then re-settles.
// Reuses startDart / DART_DURATION_MS / DART_SPEED from cruiser.
// ---------------------------------------------------------------------------
export function moveAmbusher(
  fish: DisplayFish,
  state: AIState,
  dt: number,
  _elapsedMs: number,
  bounds: Bounds,
  rng: () => number,
): void {
  const dtSec = dt / 1000;

  if (state.dartMs > 0) {
    // Active dart - apply velocity and drain timer (same as cruiser dart branch)
    fish.x += state.dartVx * dtSec;
    fish.y += state.dartVy * dtSec;
    state.dartMs -= dt;
    if (state.dartMs <= 0) {
      state.dartMs = 0;
      state.dartVx = 0;
      state.dartVy = 0;
    }
    // Contain the dart to the floor band: startDart (and flee) can produce a
    // downward dartVy that would otherwise sink the flounder below the sand,
    // or an upward one that leaps it out of the band.
    clampToBand(fish, bounds);
  } else {
    // Resting on the sand - snap back and maybe start a dart
    snapToFloor(fish, bounds);
    if (rng() < AMBUSHER_DART_PROB * dtSec) {
      startDart(state, fish.direction, rng);
    }
  }

  bounceX(fish, bounds);
}

// ---------------------------------------------------------------------------
// Archetype: drifter
// Gentle vertical bob (sine on y using wobblePhase).
// Tiny horizontal DRIFTER_DRIFT so direction/flipX still flips at edges.
// No dart.
// ---------------------------------------------------------------------------
export function moveDrifter(
  fish: DisplayFish,
  state: AIState,
  dt: number,
  elapsedMs: number,
  bounds: Bounds,
  _rng: () => number,
): void {
  const dtSec = dt / 1000;

  // Tiny horizontal drift so drifters traverse the tank and trigger x-flip
  fish.x += DRIFTER_DRIFT * fish.direction * dtSec;

  // Vertical bob: use wobblePhase with drifter-specific amplitude and period
  const yVel =
    DRIFTER_BOB_AMP *
    Math.sin((2 * Math.PI * elapsedMs) / DRIFTER_BOB_PERIOD + state.wobblePhase);
  fish.y += yVel * dtSec;

  // Keep dart state clean
  state.dartMs = 0;
  state.dartVx = 0;
  state.dartVy = 0;

  bounceX(fish, bounds);
  clampY(fish, bounds);
}

// ---------------------------------------------------------------------------
// Interaction: cohesion (WS2)
// Nudge a schooler toward the centroid of other schoolers.
// Only applies when dartMs <= 0 (caller must gate on that).
// The centroid should be computed from post-move positions EXCLUDING this fish.
// No-op when centroid === fish position (i.e. no other schoolers present).
// ---------------------------------------------------------------------------
export function cohesion(fish: DisplayFish, state: AIState, centroid: { x: number; y: number }): void {
  const dx = centroid.x - fish.x;
  const dy = centroid.y - fish.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // No other schoolers - centroid equals this fish's position
  if (dist < 0.001) return;

  // Scale toward centroid by COHESION_GAIN, capped at COHESION_MAX_V
  const rawVx = (dx / dist) * COHESION_GAIN * dist;
  const rawVy = (dy / dist) * COHESION_GAIN * dist;
  const mag = Math.sqrt(rawVx * rawVx + rawVy * rawVy);

  let vx: number;
  let vy: number;
  if (mag > COHESION_MAX_V) {
    vx = (rawVx / mag) * COHESION_MAX_V;
    vy = (rawVy / mag) * COHESION_MAX_V;
  } else {
    vx = rawVx;
    vy = rawVy;
  }

  // Apply nudge directly to position (one-shot velocity pulse, not stored)
  fish.x += vx;
  fish.y += vy;

  // Update direction to face movement if the horizontal nudge is meaningful
  if (Math.abs(vx) > 0.001) {
    fish.direction = vx >= 0 ? 1 : -1;
  }

  // Update dart state to reflect the cohesion as a brief impulse
  // (uses the dart velocity fields so the caller can gate on dartMs)
  state.dartVx = vx;
  state.dartVy = vy;
}

// ---------------------------------------------------------------------------
// Interaction: separation (the third boids rule)
// Push a schooler away from other schoolers within SEPARATION_RADIUS so the
// flock keeps spacing instead of collapsing onto the cohesion centroid and
// superimposing the sprites. Closer neighbors push harder. Exactly-overlapping
// fish use a speciesId-ordered tie-break so the two push OPPOSITE ways and
// actually unstack. Applied as a per-tick position nudge, like cohesion.
// ---------------------------------------------------------------------------
export function separation(fish: DisplayFish, neighbors: DisplayFish[]): void {
  let pushX = 0;
  let pushY = 0;
  for (const n of neighbors) {
    if (n === fish) continue;
    const dx = fish.x - n.x;
    const dy = fish.y - n.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > SEPARATION_RADIUS) continue;
    if (d < 0.001) {
      // Exactly overlapping - deterministic tie-break so the pair splits apart.
      pushX += fish.speciesId < n.speciesId ? 1 : -1;
      continue;
    }
    // Closer neighbors push harder (weight -> 1 as d -> 0).
    const w = (SEPARATION_RADIUS - d) / SEPARATION_RADIUS;
    pushX += (dx / d) * w;
    pushY += (dy / d) * w;
  }

  let vx = pushX * SEPARATION_GAIN;
  let vy = pushY * SEPARATION_GAIN;
  const mag = Math.sqrt(vx * vx + vy * vy);
  if (mag < 0.001) return;
  if (mag > SEPARATION_MAX_V) {
    vx = (vx / mag) * SEPARATION_MAX_V;
    vy = (vy / mag) * SEPARATION_MAX_V;
  }

  fish.x += vx;
  fish.y += vy;
  if (Math.abs(vx) > 0.001) {
    fish.direction = vx >= 0 ? 1 : -1;
  }
}

// ---------------------------------------------------------------------------
// Interaction: flee (WS2)
// Set an absolute flee velocity pointing AWAY from the nearest predator
// within FLEE_RADIUS. Does NOT multiply by fish.direction - the vector is a
// world-space direction so prey always moves away from the predator.
// After setting velocity, direction is updated to match travel direction.
// Reuses dartMs/dartVx/dartVy fields so the existing dart-drain loop handles it.
// No-op when no predators are within range.
// ---------------------------------------------------------------------------
export function flee(
  fish: DisplayFish,
  state: AIState,
  predators: DisplayFish[],
  dartDurationMs?: number,
): void {
  const duration = dartDurationMs ?? 500; // ms - flee dart duration

  let nearestDist = Infinity;
  let nearestPredator: DisplayFish | null = null;

  for (const predator of predators) {
    const dx = fish.x - predator.x;
    const dy = fish.y - predator.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < FLEE_RADIUS && dist < nearestDist) {
      nearestDist = dist;
      nearestPredator = predator;
    }
  }

  if (!nearestPredator) return;

  // Absolute world-vector pointing AWAY from predator - do NOT multiply by fish.direction
  const dx = fish.x - nearestPredator.x;
  const dy = fish.y - nearestPredator.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Normalize and scale to FLEE_SPEED
  const nx = dist > 0.001 ? dx / dist : 1;
  const ny = dist > 0.001 ? dy / dist : 0;

  state.dartMs = duration;
  state.dartVx = nx * FLEE_SPEED;
  state.dartVy = ny * FLEE_SPEED;

  // Update direction so sprite faces the direction of travel
  fish.direction = state.dartVx >= 0 ? 1 : -1;
}

// ---------------------------------------------------------------------------
// Archetype: predator
// Slow, steady cruise at PREDATOR_SPEED; minimal wobble; no dart.
// Deliberate, menacing movement.
// ---------------------------------------------------------------------------
export function movePredator(
  fish: DisplayFish,
  state: AIState,
  dt: number,
  elapsedMs: number,
  bounds: Bounds,
  _rng: () => number,
): void {
  const dtSec = dt / 1000;

  fish.x += PREDATOR_SPEED * fish.direction * dtSec;

  // Minimal wobble - just enough to feel alive
  const yVel =
    PREDATOR_WOBBLE_AMP *
    Math.sin((2 * Math.PI * elapsedMs) / WOBBLE_PERIOD_MS + state.wobblePhase);
  fish.y += yVel * dtSec;

  // Predators never dart
  state.dartMs = 0;
  state.dartVx = 0;
  state.dartVy = 0;

  bounceX(fish, bounds);
  clampY(fish, bounds);
}
