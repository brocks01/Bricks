import { Pedometer } from 'expo-sensors';

import { platform } from '@/lib/platform';

/**
 * The phone's step counter during a walk. Reports steps since the walk started,
 * leaving out steps taken while paused. Without a step counter (or permission)
 * it reports nothing and the walk estimates steps from distance.
 *
 * The step counter stops while the app is in the background, so the engine uses
 * the larger of this count and the distance estimate.
 */
export class StepCounter {
  private sub: { remove(): void } | null = null;
  private stopped = false;
  /** Raw count from the subscription (steps since it started). */
  private raw = 0;
  /** Steps taken while paused, taken off the raw count. */
  private excluded = 0;
  private pausedAt: number | null = null;

  constructor(private readonly onSteps: (steps: number) => void) {}

  async start(): Promise<void> {
    if (!platform.canCountSteps) return;
    try {
      if (!(await Pedometer.isAvailableAsync())) return;
      const permission = await Pedometer.requestPermissionsAsync();
      if (!permission.granted || this.stopped) return;
      this.sub = Pedometer.watchStepCount(({ steps }) => {
        this.raw = steps;
        if (this.pausedAt === null) this.onSteps(Math.max(0, this.raw - this.excluded));
      });
    } catch {
      // No step counter: steps are estimated from distance.
    }
  }

  pause(): void {
    if (this.pausedAt === null) this.pausedAt = this.raw;
  }

  resume(): void {
    if (this.pausedAt === null) return;
    this.excluded += this.raw - this.pausedAt;
    this.pausedAt = null;
  }

  stop(): void {
    this.stopped = true;
    this.sub?.remove();
    this.sub = null;
  }
}
