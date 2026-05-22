import type { FishInstance } from './Fish.js';
import type { DecorationInstance } from './Decoration.js';

/** v1 save schema. version field exists so migrations can dispatch. */
export interface SaveStateV1 {
  /** Schema version. v1 = first published shape. */
  version: 1;
  /** ISO timestamp of last save (used for offline-catchup math). */
  lastSavedAt: string;
  /** Current coin balance. */
  coinBalance: number;
  /** Lifetime coins earned (for stats/achievements). */
  lifetimeEarned: number;
  /** All owned fish instances. */
  fishInstances: FishInstance[];
  /** All placed decoration instances. */
  decorationInstances: DecorationInstance[];
}
