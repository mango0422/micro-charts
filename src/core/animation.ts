/**
 * RequestAnimationFrame-based animation utilities
 */

import type { EasingFunction, AnimationController } from '../types';
import { isBrowser } from '../types';

// Re-export types for backwards compatibility
export type { AnimationController } from '../types';

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

/**
 * Animate a value from start to end over duration
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
  // SSR safety: immediately complete animation in non-browser environment
  if (!isBrowser) {
    onUpdate(to);
    onComplete?.();
    return { cancel: () => {} };
  }

  let cancelled = false;
  let rafId: number;
  const startTime = performance.now();

  const tick = (now: number): void => {
    if (cancelled) return;

    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFn(progress);
    const value = from + (to - from) * easedProgress;

    onUpdate(value);

    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      onComplete?.();
    }
  };

  rafId = requestAnimationFrame(tick);

  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    },
  };
}
