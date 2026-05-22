import { CONSTANTS } from '../data/constants.js';

/** Function called on each sim tick. Receives elapsed time since last tick in ms. */
export type TickHandler = (dt: number) => void;

/**
 * 5Hz simulation tick loop per ADR-0003.
 * Main-thread setInterval (no Web Worker). Pauses cleanly via stop().
 */
export class SimLoop {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private handlers: TickHandler[] = [];
  private lastTickAt: number | null = null;

  /**
   * Start ticking. No-op if already running.
   *
   * Resets the dt baseline to now, so the gap between stop() and start()
   * is NOT credited via dt. That gap is handled separately by OfflineCatchup,
   * which uses lastSavedAt timestamps (not performance.now).
   */
  start(): void {
    if (this.intervalId !== null) return;
    this.lastTickAt = performance.now();
    this.intervalId = setInterval(() => this.tick(), CONSTANTS.SIM_TICK_MS);
  }

  /** Stop ticking. Handlers are preserved; call start() to resume. */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.lastTickAt = null;
  }

  /** True if the loop is currently ticking. */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Register a handler that runs on every tick.
   * Returns an unsubscribe function.
   */
  addTickHandler(fn: TickHandler): () => void {
    this.handlers.push(fn);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== fn);
    };
  }

  private tick(): void {
    const now = performance.now();
    const dt = this.lastTickAt !== null ? now - this.lastTickAt : CONSTANTS.SIM_TICK_MS;
    this.lastTickAt = now;
    for (const handler of this.handlers) {
      handler(dt);
    }
  }
}
