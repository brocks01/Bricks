import type { Origin } from './types';

// "What did the agent do, and where?" is answered by this log, not by hope.
export type MovementEvent =
  | { type: 'moved'; key: string; origin: Origin; at: number }
  | { type: 'refused'; key: string; origin: Origin; reason: string; at: number }
  | { type: 'skill'; id: string; origin: Origin; ok: boolean; at: number }
  | { type: 'control'; key: string; what: 'fill' | 'press'; origin: Origin; at: number };

const events: MovementEvent[] = [];

type WithoutAt<T> = T extends unknown ? Omit<T, 'at'> : never; // keeps each event shape separate

export function note(e: WithoutAt<MovementEvent>): void {
  events.push({ ...e, at: Date.now() } as MovementEvent);
  if (events.length > 500) events.shift();
}
export const getLog = (): MovementEvent[] => events.slice();
