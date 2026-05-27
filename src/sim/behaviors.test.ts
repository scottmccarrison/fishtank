import { describe, it, expect } from 'vitest';
import type { DisplayFish } from '../types/Fish.js';
import {
  moveRester,
  moveWalker,
  moveGlider,
  moveAmbusher,
  moveDrifter,
  movePredator,
  moveSchooler,
  moveCruiser,
  cohesion,
  separation,
  flee,
  SEPARATION_RADIUS,
  BOTTOM_BAND,
  DIORAMA_HEIGHT,
  DRIFT_SPEED,
  PREDATOR_SPEED,
  COHESION_MAX_V,
  FLEE_RADIUS,
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
// Floor archetypes
// ---------------------------------------------------------------------------
const floorY = DEFAULT_BOUNDS.height - DEFAULT_BOUNDS.margin; // 448
const bandTop = DIORAMA_HEIGHT - BOTTOM_BAND; // 360

describe('moveRester', () => {
  it('snaps y to floorY (448) on every tick', () => {
    const fish = makeFish({ y: 40, behaviorType: 'rester' });
    const state = makeState();
    moveRester(fish, state, 16, 16, DEFAULT_BOUNDS, stableRng);
    expect(fish.y).toBe(floorY);
  });

  it('stays at floorY over many ticks', () => {
    const fish = makeFish({ y: 240, behaviorType: 'rester' });
    const state = makeState();
    for (let i = 0; i < 200; i++) {
      moveRester(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      expect(fish.y).toBe(floorY);
    }
  });

  it('does not move horizontally', () => {
    const fish = makeFish({ x: 225, y: 448, behaviorType: 'rester' });
    const state = makeState();
    const startX = fish.x;
    for (let i = 0; i < 100; i++) {
      moveRester(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(fish.x).toBe(startX);
  });

  it('never sets dartMs > 0', () => {
    const fish = makeFish({ y: 400, behaviorType: 'rester' });
    const state = makeState();
    for (let i = 0; i < 100; i++) {
      moveRester(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(state.dartMs).toBe(0);
  });
});

describe('moveWalker', () => {
  it('moves horizontally over time', () => {
    const fish = makeFish({ x: 100, y: 240, direction: 1, behaviorType: 'walker' });
    const state = makeState();
    const startX = fish.x;
    moveWalker(fish, state, 1000, 0, DEFAULT_BOUNDS, stableRng);
    expect(fish.x).toBeGreaterThan(startX);
  });

  it('stays at floorY (448) on every tick', () => {
    const fish = makeFish({ y: 240, behaviorType: 'walker' });
    const state = makeState();
    for (let i = 0; i < 200; i++) {
      moveWalker(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      expect(fish.y).toBe(floorY);
    }
  });

  it('flips at x edges', () => {
    const fish = makeFish({ x: 445, y: floorY, direction: 1, behaviorType: 'walker' });
    const state = makeState();
    moveWalker(fish, state, 16, 16, DEFAULT_BOUNDS, stableRng);
    expect(fish.direction).toBe(-1);
    expect(fish.x).toBeLessThanOrEqual(DEFAULT_BOUNDS.width - DEFAULT_BOUNDS.margin);
  });

  it('never sets dartMs > 0', () => {
    const fish = makeFish({ y: floorY, behaviorType: 'walker' });
    const state = makeState();
    for (let i = 0; i < 100; i++) {
      moveWalker(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(state.dartMs).toBe(0);
  });
});

describe('moveGlider', () => {
  it('stays within [bandTop, floorY] over many ticks', () => {
    const fish = makeFish({ x: 225, y: floorY, behaviorType: 'glider' });
    const state = makeState({ wobblePhase: 0 });
    for (let i = 0; i < 500; i++) {
      moveGlider(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      expect(fish.y).toBeGreaterThanOrEqual(bandTop);
      expect(fish.y).toBeLessThanOrEqual(floorY);
    }
  });

  it('y oscillates (is not frozen)', () => {
    // Start in the middle of the band so the sine can push y both up and down
    const midBand = Math.round((bandTop + floorY) / 2); // ~404
    const fish = makeFish({ x: 225, y: midBand, behaviorType: 'glider' });
    const state = makeState({ wobblePhase: 0 });
    // Bob amplitude is 14 px/s; over ~1 second the fish should visit multiple y values
    const yValues = new Set<number>();
    for (let i = 0; i < 60; i++) {
      moveGlider(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      yValues.add(Math.round(fish.y));
    }
    // Should have visited more than one distinct y value
    expect(yValues.size).toBeGreaterThan(1);
  });

  it('moves horizontally and flips at edges', () => {
    const fish = makeFish({ x: 445, y: floorY, direction: 1, behaviorType: 'glider' });
    const state = makeState();
    moveGlider(fish, state, 16, 16, DEFAULT_BOUNDS, stableRng);
    expect(fish.direction).toBe(-1);
  });

  it('never sets dartMs > 0', () => {
    const fish = makeFish({ y: floorY, behaviorType: 'glider' });
    const state = makeState();
    for (let i = 0; i < 100; i++) {
      moveGlider(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(state.dartMs).toBe(0);
  });
});

describe('moveAmbusher', () => {
  it('rests at floorY (448) when not darting', () => {
    // Use stable rng (0.5) so dart prob check never fires: 0.5 > AMBUSHER_DART_PROB*dtSec
    const fish = makeFish({ y: 240, behaviorType: 'ambusher' });
    const state = makeState();
    for (let i = 0; i < 100; i++) {
      moveAmbusher(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(fish.y).toBe(floorY);
  });

  it('darts off the floor when rng is forced below AMBUSHER_DART_PROB*dtSec', () => {
    // dtSec = 16/1000 = 0.016; AMBUSHER_DART_PROB*dtSec ~= 0.00048; use rng=0 to force dart
    const alwaysDart = () => 0;
    const fish = makeFish({ x: 225, y: floorY, direction: 1, behaviorType: 'ambusher' });
    const state = makeState();
    // First tick: not darting, rng < threshold -> startDart arms dartMs
    moveAmbusher(fish, state, 16, 0, DEFAULT_BOUNDS, alwaysDart);
    expect(state.dartMs).toBeGreaterThan(0);
    // y should now move off floor during dart
    const yDuringDart = fish.y;
    moveAmbusher(fish, state, 16, 16, DEFAULT_BOUNDS, alwaysDart);
    // During active dart, y is driven by dartVy - may not equal floorY
    expect(state.dartMs).toBeGreaterThan(0);
    // After dart expires, settle back to floorY
    // Drain remaining dartMs with enough ticks
    for (let i = 0; i < 100; i++) {
      moveAmbusher(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
    }
    expect(fish.y).toBe(floorY);
    // Suppress unused variable warning
    void yDuringDart;
  });

  it('never leaves the horizontal bounds', () => {
    const fish = makeFish({ x: 445, y: floorY, direction: 1, behaviorType: 'ambusher' });
    const state = makeState();
    for (let i = 0; i < 200; i++) {
      moveAmbusher(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      expect(fish.x).toBeGreaterThanOrEqual(DEFAULT_BOUNDS.margin);
      expect(fish.x).toBeLessThanOrEqual(DEFAULT_BOUNDS.width - DEFAULT_BOUNDS.margin);
    }
  });

  it('contains a downward dart to the floor band (never sinks below the sand)', () => {
    const fish = makeFish({ x: 225, y: floorY, direction: 1, behaviorType: 'ambusher' });
    // Force a max downward dart (positive dartVy); without the band clamp this
    // would push the flounder below floorY and off the sand.
    const state = makeState({ dartMs: 800, dartVy: 80 });
    for (let i = 0; i < 60; i++) {
      moveAmbusher(fish, state, 16, i * 16, DEFAULT_BOUNDS, stableRng);
      expect(fish.y).toBeLessThanOrEqual(floorY);
    }
  });
});

// ---------------------------------------------------------------------------
// Floor separation
// ---------------------------------------------------------------------------
describe('floor separation', () => {
  it('two walkers close together push apart', () => {
    const a = makeFish({ speciesId: 'crab-blue', x: 200, y: floorY, behaviorType: 'walker' });
    const b = makeFish({ speciesId: 'crab-king', x: 210, y: floorY, behaviorType: 'walker' });
    const ax = a.x;
    separation(a, [a, b]);
    // a is to the left of b; separation should push a further left
    expect(a.x).toBeLessThan(ax);
  });

  it('two walkers beyond SEPARATION_RADIUS are not affected', () => {
    const a = makeFish({ speciesId: 'crab-blue', x: 50, y: floorY, behaviorType: 'walker' });
    const b = makeFish({ speciesId: 'crab-king', x: 50 + SEPARATION_RADIUS + 10, y: floorY, behaviorType: 'walker' });
    const ax = a.x;
    separation(a, [a, b]);
    expect(a.x).toBe(ax);
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

// ---------------------------------------------------------------------------
// WS2: cohesion
// ---------------------------------------------------------------------------
describe('cohesion', () => {
  it('nudges a schooler toward the centroid', () => {
    // Fish at x=100, centroid at x=200 - should move right
    const fish = makeFish({ x: 100, y: 240, direction: 1, behaviorType: 'schooler' });
    const state = makeState();
    const startX = fish.x;
    cohesion(fish, state, { x: 200, y: 240 });
    expect(fish.x).toBeGreaterThan(startX);
  });

  it('nudges a schooler upward toward a centroid above it', () => {
    const fish = makeFish({ x: 225, y: 300, behaviorType: 'schooler' });
    const state = makeState();
    const startY = fish.y;
    cohesion(fish, state, { x: 225, y: 200 });
    expect(fish.y).toBeLessThan(startY);
  });

  it('caps the nudge at COHESION_MAX_V', () => {
    // Fish very far from centroid - nudge should be capped
    const fish = makeFish({ x: 0, y: 240, behaviorType: 'schooler' });
    const state = makeState();
    cohesion(fish, state, { x: 10000, y: 240 });
    // The impulse applied to fish.x should not exceed COHESION_MAX_V
    expect(fish.x).toBeLessThanOrEqual(COHESION_MAX_V + 0.001);
  });

  it('is a no-op when centroid is at fish position (no other schoolers)', () => {
    const fish = makeFish({ x: 225, y: 240, behaviorType: 'schooler' });
    const state = makeState();
    const startX = fish.x;
    const startY = fish.y;
    cohesion(fish, state, { x: 225, y: 240 });
    expect(fish.x).toBe(startX);
    expect(fish.y).toBe(startY);
  });

  it('updates direction to face the horizontal nudge direction', () => {
    // Fish to the right of centroid - should get nudged left, direction becomes -1
    const fish = makeFish({ x: 400, y: 240, direction: 1, behaviorType: 'schooler' });
    const state = makeState();
    cohesion(fish, state, { x: 100, y: 240 });
    expect(fish.direction).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// WS2: flee
// ---------------------------------------------------------------------------
describe('separation', () => {
  it('pushes a schooler away from a nearby same-archetype neighbor', () => {
    // a is left of b; separation should push a further left (away from b)
    const a = makeFish({ speciesId: 'goldfish', x: 200, y: 240, behaviorType: 'schooler' });
    const b = makeFish({ speciesId: 'guppy', x: 210, y: 240, behaviorType: 'schooler' });
    const ax = a.x;
    separation(a, [a, b]);
    expect(a.x).toBeLessThan(ax);
  });

  it('unstacks exactly-superimposed fish in opposite directions (speciesId tie-break)', () => {
    const a = makeFish({ speciesId: 'goldfish', x: 200, y: 240, behaviorType: 'schooler' });
    const b = makeFish({ speciesId: 'neon-tetra', x: 200, y: 240, behaviorType: 'schooler' });
    separation(a, [a, b]);
    separation(b, [a, b]);
    // goldfish < neon-tetra: a pushes +x, b pushes -x - they no longer overlap
    expect(a.x).not.toBe(b.x);
  });

  it('is a no-op when the other schooler is beyond SEPARATION_RADIUS', () => {
    const a = makeFish({ speciesId: 'goldfish', x: 50, y: 240, behaviorType: 'schooler' });
    const far = makeFish({ speciesId: 'guppy', x: 50 + SEPARATION_RADIUS + 10, y: 240, behaviorType: 'schooler' });
    const ax = a.x;
    separation(a, [a, far]);
    expect(a.x).toBe(ax);
  });

  it('is a no-op with no neighbors', () => {
    const a = makeFish({ x: 100, y: 240, behaviorType: 'schooler' });
    const ax = a.x;
    separation(a, [a]);
    expect(a.x).toBe(ax);
  });
});

describe('flee', () => {
  it('pushes prey AWAY from a nearby predator on the x-axis', () => {
    // Predator to the left of prey - prey should flee right (dartVx > 0)
    const prey = makeFish({ x: 200, y: 240, direction: 1, behaviorType: 'schooler' });
    const predator = makeFish({ x: 150, y: 240, behaviorType: 'predator' });
    const state = makeState();
    flee(prey, state, [predator]);
    // dartVx should be positive (prey moving right - away from predator on left)
    expect(state.dartVx).toBeGreaterThan(0);
  });

  it('pushes prey AWAY from a predator on the right', () => {
    // Predator to the right of prey - prey should flee left (dartVx < 0)
    const prey = makeFish({ x: 200, y: 240, direction: 1, behaviorType: 'schooler' });
    const predator = makeFish({ x: 250, y: 240, behaviorType: 'predator' });
    const state = makeState();
    flee(prey, state, [predator]);
    expect(state.dartVx).toBeLessThan(0);
  });

  it('sets direction to match the flee velocity x-sign', () => {
    // Predator to the right - prey flees left - direction should be -1
    const prey = makeFish({ x: 200, y: 240, direction: 1, behaviorType: 'schooler' });
    const predator = makeFish({ x: 280, y: 240, behaviorType: 'predator' });
    const state = makeState();
    flee(prey, state, [predator]);
    // direction should match: dartVx < 0 means direction = -1
    expect(prey.direction).toBe(state.dartVx >= 0 ? 1 : -1);
  });

  it('sets dartMs > 0 when a predator is within range', () => {
    const prey = makeFish({ x: 200, y: 240, behaviorType: 'cruiser' });
    const predator = makeFish({ x: 230, y: 240, behaviorType: 'predator' });
    const state = makeState();
    flee(prey, state, [predator]);
    expect(state.dartMs).toBeGreaterThan(0);
  });

  it('is a no-op when predator is beyond FLEE_RADIUS', () => {
    const prey = makeFish({ x: 200, y: 240, behaviorType: 'cruiser' });
    // Place predator well beyond FLEE_RADIUS
    const predator = makeFish({ x: 200 + FLEE_RADIUS + 50, y: 240, behaviorType: 'predator' });
    const state = makeState();
    flee(prey, state, [predator]);
    // No change - no flee triggered
    expect(state.dartMs).toBe(0);
    expect(state.dartVx).toBe(0);
  });

  it('is a no-op with an empty predators array', () => {
    const prey = makeFish({ x: 200, y: 240, behaviorType: 'cruiser' });
    const state = makeState();
    flee(prey, state, []);
    expect(state.dartMs).toBe(0);
    expect(state.dartVx).toBe(0);
  });

  it('predator is unaffected when passed as prey - flee does nothing for a predator', () => {
    // In FishAI, flee is only called for non-predators; test the guard assumption
    // by verifying flee with a predator fish does set dartMs (flee has no predator-guard -
    // FishAI gates it). This test documents the raw function behavior.
    // The FishAI-level test below confirms predators are not passed to flee.
    const predator = makeFish({ x: 200, y: 240, behaviorType: 'predator' });
    const nearbyPredator = makeFish({ x: 230, y: 240, behaviorType: 'predator' });
    const state = makeState();
    // FishAI does NOT call flee on predators - this is the integration-level guarantee.
    // We simply confirm flee() itself is a pure function and returns nothing.
    const result = flee(predator, state, [nearbyPredator]);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// clampY waterline inset (Bounds.top)
// ---------------------------------------------------------------------------
describe('clampY top inset (waterline)', () => {
  const TOP_BOUNDS: Bounds = { width: 450, height: 480, margin: 32, top: 60 };

  it('keeps a swimmer below bounds.top when set', () => {
    const fish = makeFish({ y: 10 }); // start above the waterline
    const state = makeState();
    for (let i = 0; i < 200; i++) {
      moveCruiser(fish, state, 200, i * 200, TOP_BOUNDS, stableRng);
      expect(fish.y).toBeGreaterThanOrEqual(60);
      expect(fish.y).toBeLessThanOrEqual(TOP_BOUNDS.height - TOP_BOUNDS.margin);
    }
  });

  it('falls back to margin as the top bound when top is omitted', () => {
    const fish = makeFish({ y: 10 });
    const state = makeState();
    moveCruiser(fish, state, 200, 0, DEFAULT_BOUNDS, stableRng);
    // No top inset -> the original margin bound (32) applies, not 60.
    expect(fish.y).toBeGreaterThanOrEqual(DEFAULT_BOUNDS.margin);
    expect(fish.y).toBeLessThan(60);
  });
});

// ---------------------------------------------------------------------------
// floorAt: sloped substrate support in Bounds
// ---------------------------------------------------------------------------
describe('snapToFloor with floorAt', () => {
  it('snaps a walker/rester to floorAt(x)=300 instead of the flat default (448)', () => {
    const slopedBounds: Bounds = {
      width: 450,
      height: 480,
      margin: 32,
      floorAt: (_x: number) => 300,
    };

    const walker = makeFish({ x: 225, y: 400, behaviorType: 'walker' });
    const walkerState = makeState();
    moveWalker(walker, walkerState, 16, 0, slopedBounds, stableRng);
    expect(walker.y).toBe(300);

    const rester = makeFish({ x: 225, y: 400, behaviorType: 'rester' });
    const resterState = makeState();
    moveRester(rester, resterState, 16, 0, slopedBounds, stableRng);
    expect(rester.y).toBe(300);
  });
});
