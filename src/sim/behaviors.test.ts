import { describe, it, expect } from 'vitest';
import type { DisplayFish } from '../types/Fish.js';
import {
  moveBottomDweller,
  moveDrifter,
  movePredator,
  moveSchooler,
  moveCruiser,
  BOTTOM_BAND,
  DIORAMA_HEIGHT,
  DRIFT_SPEED,
  PREDATOR_SPEED,
  type AIState,
  type Bounds,
} from './behaviors.js';

// Default bounds matching the standard diorama (450x480, margin 32)
const DEFAULT_BOUNDS: Bounds = { width: 450, height: 480, margin: 32 };

const stableRng = () => 0.5;

function makeState(overrides: Partial<AIState> = {}): AIState {
  return {
    driftSpeed: DRIFT_SPEED,
    wobblePhase: 0,
    dartMs: 0,
    dartVx: 0,
    dartVy: 0,
    ...overrides,
  };
}

function makeFish(overrides: Partial<DisplayFish> = {}): DisplayFish {
  return {
    speciesId: 'test',
    x: 225,
    y: 240,
    direction: 1,
    behaviorType: 'cruiser',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Bottom-dweller
// ---------------------------------------------------------------------------
describe('moveBottomDweller', () => {
  const bandTop = DIORAMA_HEIGHT - BOTTOM_BAND; // 360
  const bandBottom = DEFAULT_BOUNDS.height - DEFAULT_BOUNDS.margin; // 448

  it('snaps a fish spawned at y=40 into the band on the first tick', () => {
    const fish = makeFish({ y: 40, behaviorType: 'bottom-dweller' });
    const state = makeState();
    moveBottomDweller(fish, state, 16, 16, DEFAULT_BOUNDS, stableRng);
    expect(fish.y).toBeGreaterThanOrEqual(bandTop);
    expect(fish.y).toBeLessThanOrEqual(bandBottom);
  });

  it('stays in band over many ticks', () => {
    const fish = makeFish({ y: 40, behaviorType: 'bottom-dweller' });
    const state = makeState();
    for (let i = 0; i < 200; i++) {
      moveBottomDweller(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      expect(fish.y).toBeGreaterThanOrEqual(bandTop);
      expect(fish.y).toBeLessThanOrEqual(bandBottom);
    }
  });

  it('stays in band when starting below the top of the band', () => {
    // Start right at the band bottom edge
    const fish = makeFish({ y: bandBottom + 50, behaviorType: 'bottom-dweller' });
    const state = makeState();
    moveBottomDweller(fish, state, 16, 16, DEFAULT_BOUNDS, stableRng);
    expect(fish.y).toBeLessThanOrEqual(bandBottom);
    expect(fish.y).toBeGreaterThanOrEqual(bandTop);
  });

  it('moves horizontally and flips at x edges', () => {
    const fish = makeFish({ x: 445, y: 400, direction: 1, behaviorType: 'bottom-dweller' });
    const state = makeState();
    moveBottomDweller(fish, state, 16, 16, DEFAULT_BOUNDS, stableRng);
    expect(fish.direction).toBe(-1);
    expect(fish.x).toBeLessThanOrEqual(DEFAULT_BOUNDS.width - DEFAULT_BOUNDS.margin);
  });

  it('never sets dartMs > 0', () => {
    const fish = makeFish({ y: 400, behaviorType: 'bottom-dweller' });
    const state = makeState();
    for (let i = 0; i < 100; i++) {
      moveBottomDweller(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(state.dartMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Drifter
// ---------------------------------------------------------------------------
describe('moveDrifter', () => {
  it('stays bounded vertically over many ticks', () => {
    const fish = makeFish({ x: 225, y: 240, behaviorType: 'drifter' });
    const state = makeState();
    for (let i = 0; i < 500; i++) {
      moveDrifter(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      expect(fish.y).toBeGreaterThanOrEqual(DEFAULT_BOUNDS.margin);
      expect(fish.y).toBeLessThanOrEqual(DEFAULT_BOUNDS.height - DEFAULT_BOUNDS.margin);
    }
  });

  it('drifts horizontally and can flip direction at edges', () => {
    // Start near right edge facing right - must flip
    const fish = makeFish({ x: 440, y: 240, direction: 1, behaviorType: 'drifter' });
    const state = makeState();
    // Run enough ticks to reach the edge
    for (let i = 0; i < 200; i++) {
      moveDrifter(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    // Should have flipped at least once (direction ends up -1 after hitting right wall)
    expect(fish.direction).toBe(-1);
  });

  it('does not dart', () => {
    const fish = makeFish({ x: 225, y: 240, behaviorType: 'drifter' });
    const state = makeState();
    for (let i = 0; i < 100; i++) {
      moveDrifter(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(state.dartMs).toBe(0);
  });

  it('has measurable horizontal displacement (not frozen)', () => {
    const fish = makeFish({ x: 100, y: 240, direction: 1, behaviorType: 'drifter' });
    const state = makeState();
    const startX = fish.x;
    // Run 1 second worth of ticks
    for (let i = 0; i < 60; i++) {
      moveDrifter(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    // Should have moved at least a few pixels horizontally
    expect(Math.abs(fish.x - startX)).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Predator vs cruiser speed comparison
// ---------------------------------------------------------------------------
describe('movePredator', () => {
  it('net horizontal displacement over many ticks is less than a cruiser', () => {
    // Measure over a full wobble period worth of ticks so wobble phase does not bias result
    // Use a stable rng so neither fish darts
    const tickMs = 16;
    // ~2 full wobble periods worth of ticks
    const ticks = Math.ceil((4000 * 2) / tickMs);

    const predator = makeFish({ x: 100, y: 240, direction: 1, behaviorType: 'predator' });
    const predState = makeState({ wobblePhase: 0 });

    const cruiser = makeFish({ x: 100, y: 240, direction: 1, behaviorType: 'cruiser' });
    const cruiserState = makeState({ wobblePhase: 0 });

    const noFlipBounds: Bounds = { width: 10000, height: 480, margin: 32 };

    let elapsedMs = 0;
    for (let i = 0; i < ticks; i++) {
      elapsedMs += tickMs;
      movePredator(predator, predState, tickMs, elapsedMs, noFlipBounds, stableRng);
      moveCruiser(cruiser, cruiserState, tickMs, elapsedMs, noFlipBounds, stableRng);
    }

    const predDist = predator.x - 100;
    const cruiserDist = cruiser.x - 100;

    // Predator cruises at PREDATOR_SPEED (12) vs cruiser DRIFT_SPEED (20)
    expect(predDist).toBeLessThan(cruiserDist);
    // Predator should still have moved forward
    expect(predDist).toBeGreaterThan(0);
  });

  it('predator speed constant is less than cruiser drift speed', () => {
    expect(PREDATOR_SPEED).toBeLessThan(DRIFT_SPEED);
  });

  it('does not dart', () => {
    const fish = makeFish({ x: 225, y: 240, behaviorType: 'predator' });
    const state = makeState();
    for (let i = 0; i < 100; i++) {
      movePredator(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(state.dartMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Schooler
// ---------------------------------------------------------------------------
describe('moveSchooler', () => {
  it('drifts horizontally over time', () => {
    const fish = makeFish({ x: 100, y: 240, direction: 1, behaviorType: 'schooler' });
    const state = makeState();
    const startX = fish.x;
    moveSchooler(fish, state, 1000, 1000, DEFAULT_BOUNDS, stableRng);
    expect(fish.x).not.toBe(startX);
  });

  it('stays within bounds over many ticks', () => {
    const fish = makeFish({ x: 225, y: 240, behaviorType: 'schooler' });
    const state = makeState();
    for (let i = 0; i < 200; i++) {
      moveSchooler(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      expect(fish.x).toBeGreaterThanOrEqual(DEFAULT_BOUNDS.margin);
      expect(fish.x).toBeLessThanOrEqual(DEFAULT_BOUNDS.width - DEFAULT_BOUNDS.margin);
      expect(fish.y).toBeGreaterThanOrEqual(DEFAULT_BOUNDS.margin);
      expect(fish.y).toBeLessThanOrEqual(DEFAULT_BOUNDS.height - DEFAULT_BOUNDS.margin);
    }
  });
});
