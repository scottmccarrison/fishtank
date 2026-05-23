import { describe, it, expect } from 'vitest';
import { clampToTank } from './DecorationManager.js';

// Bottom clamp tuned so a typical decoration's bottom sits near the top of
// the sand: max y = 600 - (60 + 25) = 515.
const BOTTOM_CLAMP = 515;

describe('clampToTank', () => {
  it('passes through positions within bounds', () => {
    expect(clampToTank(400, 300)).toEqual({ x: 400, y: 300 });
  });

  it('clamps x below left margin', () => {
    expect(clampToTank(-50, 300)).toEqual({ x: 20, y: 300 });
  });

  it('clamps x above right margin', () => {
    expect(clampToTank(900, 300)).toEqual({ x: 780, y: 300 });
  });

  it('clamps y below top margin', () => {
    expect(clampToTank(400, -10)).toEqual({ x: 400, y: 20 });
  });

  it('clamps y above bottom margin (above the sandy floor)', () => {
    expect(clampToTank(400, 700)).toEqual({ x: 400, y: BOTTOM_CLAMP });
  });

  it('clamps both axes simultaneously', () => {
    expect(clampToTank(-100, -100)).toEqual({ x: 20, y: 20 });
    expect(clampToTank(1000, 1000)).toEqual({ x: 780, y: BOTTOM_CLAMP });
  });
});
