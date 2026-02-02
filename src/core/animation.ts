/**
 * RequestAnimationFrame-based animation utilities with global scheduler
 */

import type { EasingFunction, AnimationController } from '../types';
import { isBrowser } from '../types';
import { isAnimationDisabled } from './config';

// Re-export types for backwards compatibility
export type { AnimationController, EasingFunction } from '../types';

/** @deprecated Use EasingFunction from types instead */
export type EasingFn = EasingFunction;

/** Built-in easing functions */
export const easing = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
} as const;

// === Global RAF Scheduler ===
// Single rAF loop for all animations and render batching

type TaskCallback = (now: number) => boolean; // returns true if should continue

class GlobalScheduler {
  private tasks = new Set<TaskCallback>();
  private rafId = 0;
  private running = false;

  add(task: TaskCallback): void {
    this.tasks.add(task);
    if (!this.running) {
      this.start();
    }
  }

  remove(task: TaskCallback): void {
    this.tasks.delete(task);
    if (this.tasks.size === 0) {
      this.stop();
    }
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  private stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick = (): void => {
    const now = performance.now();

    // Update all tasks and remove completed ones
    for (const task of this.tasks) {
      const shouldContinue = task(now);
      if (!shouldContinue) {
        this.tasks.delete(task);
      }
    }

    // Continue loop if there are tasks
    if (this.tasks.size > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
    }
  };
}

const globalScheduler = isBrowser ? new GlobalScheduler() : null;

// SSR-safe noop controller (reused to avoid allocation)
const NOOP_CONTROLLER: AnimationController = { cancel: () => {} };

/**
 * Animate a value from start to end over duration using global scheduler
 * @param from - Start value
 * @param to - End value
 * @param duration - Duration in milliseconds
 * @param onUpdate - Called each frame with current value
 * @param onComplete - Called when animation completes
 * @param easingFn - Easing function (default: easeInOutQuad)
 * @returns Controller with cancel() method
 */
export function animate(
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
  easingFn: EasingFunction = easing.easeInOutQuad
): AnimationController {
  // Skip animation if globally disabled, SSR, or non-browser environment
  if (!isBrowser || !globalScheduler || isAnimationDisabled()) {
    onUpdate(to);
    onComplete?.();
    return NOOP_CONTROLLER;
  }

  let cancelled = false;
  const startTime = performance.now();

  const task: TaskCallback = (now: number): boolean => {
    if (cancelled) return false;

    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFn(progress);
    const value = from + (to - from) * easedProgress;

    onUpdate(value);

    if (progress >= 1) {
      onComplete?.();
      return false; // Task complete
    }
    return true; // Continue
  };

  globalScheduler.add(task);

  return {
    cancel: () => {
      if (!cancelled) {
        cancelled = true;
        globalScheduler?.remove(task);
      }
    },
  };
}

/**
 * Schedule a render callback to run on next animation frame
 * Multiple calls with same callback will be batched into single frame
 * @param callback - Render function to call
 * @returns Cancel function
 */
export function scheduleRender(callback: () => void): () => void {
  if (!isBrowser || !globalScheduler) {
    callback(); // SSR: execute immediately
    return () => {};
  }

  let scheduled = false;
  let cancelled = false;

  const task: TaskCallback = (): boolean => {
    if (cancelled) return false;
    callback();
    scheduled = false;
    return false; // One-shot task
  };

  if (!scheduled) {
    scheduled = true;
    globalScheduler.add(task);
  }

  return () => {
    if (scheduled && !cancelled) {
      cancelled = true;
      globalScheduler?.remove(task);
      scheduled = false;
    }
  };
}
