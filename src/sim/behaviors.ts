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

// Bottom-dweller constants
export const BOTTOM_BAND = 120;          // px - bottom-dwellers live in [DIORAMA_HEIGHT-120, DIORAMA_HEIGHT-margin]
export const BOTTOM_DRIFT_SPEED = 8;     // px/s - slow horizontal crawl

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
  if (fish.y < bounds.margin) fish.y = bounds.margin;
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
// Archetype: bottom-dweller
// Confined to [DIORAMA_HEIGHT - BOTTOM_BAND, height - margin].
// Hard-snap y into band on every tick (replaces generic y clamp).
// Slow horizontal crawl, no wobble, no dart.
// ---------------------------------------------------------------------------
export function moveBottomDweller(
  fish: DisplayFish,
  state: AIState,
  dt: number,
  _elapsedMs: number,
  bounds: Bounds,
  _rng: () => number,
): void {
  const dtSec = dt / 1000;

  // Horizontal crawl only (always drifting, no dart for bottom-dwellers)
  fish.x += BOTTOM_DRIFT_SPEED * fish.direction * dtSec;

  // Hard-snap y into bottom band - replaces generic y clamp
  const bandTop = DIORAMA_HEIGHT - BOTTOM_BAND;
  const bandBottom = bounds.height - bounds.margin;
  if (fish.y < bandTop) fish.y = bandTop;
  if (fish.y > bandBottom) fish.y = bandBottom;

  // Keep dart state clean (bottom-dwellers never dart)
  state.dartMs = 0;
  state.dartVx = 0;
  state.dartVy = 0;

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
