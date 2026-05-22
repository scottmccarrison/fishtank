import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimLoop } from './SimLoop.js';
import { CONSTANTS } from '../data/constants.js';

describe('SimLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires handlers at SIM_TICK_MS intervals', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    loop.addTickHandler(handler);
    loop.start();

    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    expect(handler).toHaveBeenCalledTimes(5);
  });

  it('passes dt to handlers', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    loop.addTickHandler(handler);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS);
    expect(handler).toHaveBeenCalledWith(expect.any(Number));
    const dt = handler.mock.calls[0]?.[0] as number;
    expect(dt).toBeGreaterThan(0);
  });

  it('start() is idempotent', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    loop.addTickHandler(handler);
    loop.start();
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stop() halts ticks', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    loop.addTickHandler(handler);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS);
    loop.stop();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('addTickHandler returns an unsubscribe function', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    const unsub = loop.addTickHandler(handler);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS);
    unsub();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isRunning() reflects state', () => {
    const loop = new SimLoop();
    expect(loop.isRunning()).toBe(false);
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });
});
