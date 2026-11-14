// Where a walk's location points come from. The engine (engine.ts, ported from the teammates' app) only needs something with start/pause/resume/stop.
//  - GpsSource: the device's own location (navigator.geolocation: the browser, and the phone's built-in location). Needs the person's permission.
//  - PracticeSource: a make-believe walk at an easy pace, so the screen can be tried on a computer or indoors. Clearly labelled "practice" on screen and saved like a walk.
import type { PointSource } from './engine';
import type { TrackPoint } from './geo';

export const gpsAvailable = (): boolean => typeof navigator !== 'undefined' && !!navigator.geolocation;

export class GpsSource implements PointSource {
  private watch: number | null = null;
  private onPoint: ((p: TrackPoint) => void) | null = null;
  private running = false;

  constructor(private readonly onError?: (message: string) => void) {}

  start(onPoint: (p: TrackPoint) => void): void {
    this.onPoint = onPoint;
    this.running = true;
    this.listen();
  }

  private listen(): void {
    if (!gpsAvailable() || this.watch !== null) return;
    this.watch = navigator.geolocation.watchPosition(
      (pos) => {
        if (this.running) this.onPoint?.({ lat: pos.coords.latitude, lng: pos.coords.longitude, t: pos.timestamp || Date.now(), accuracy: pos.coords.accuracy });
      },
      (err) => this.onError?.(err.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
    if (this.watch !== null && gpsAvailable()) navigator.geolocation.clearWatch(this.watch);
    this.watch = null;
  }
}

/** Walks in a straight line near Bishan at about 1.3 m/s (a comfortable pace), one point every second. `speed` makes it faster for testing. */
export class PracticeSource implements PointSource {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private metres = 0;
  private last = Date.now();

  constructor(private readonly speed = 1) {}

  start(onPoint: (p: TrackPoint) => void): void {
    this.running = true;
    this.last = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      if (this.running) {
        this.metres += ((now - this.last) / 1000) * 1.3 * this.speed;
        const dLat = this.metres / 111_320; // metres to degrees of latitude
        onPoint({ lat: 1.3526 + dLat, lng: 103.8352, t: now, accuracy: 5 });
      }
      this.last = now;
    }, 1000);
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    this.running = true;
    this.last = Date.now();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
