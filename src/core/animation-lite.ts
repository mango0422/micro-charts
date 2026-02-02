/**
 * Lite animation utilities - No animation, immediate rendering
 *
 * This module provides the same API as animation.ts but without actual animation.
 * Use this for production builds where animation is not needed.
 */

import type { AnimationController } from '../types';

// Re-export types for compatibility
export type { AnimationController } from '../types';

/** @deprecated Use EasingFunction from types instead */
export type EasingFn = (t: number) => number;

/** Easing functions (no-op in lite mode, included for API compatibility) */
export const easing = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => t,
  easeOutQuad: (t: number): number => t,
  easeInOutQuad: (t: number): number => t,
  easeOutCubic: (t: number): number => t,
  easeInOutCubic: (t: number): number => t,
} as const;

// Reusable noop controller (avoids allocation)
const NOOP_CONTROLLER: AnimationController = { cancel: () => {} };

/**
 * Lite animate - immediately sets final value (no animation)
 * Same API as animate() but skips all animation logic
 */
export function animate(
  _from: number,
  to: number,
  _duration: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
  _easingFn?: (t: number) => number
): AnimationController {
  // Immediately call with final value
  onUpdate(to);
  onComplete?.();
  return NOOP_CONTROLLER;
}

/**
 * Lite scheduleRender - executes callback synchronously
 * For lite builds, we skip RAF batching entirely
 */
export function scheduleRender(callback: () => void): () => void {
  callback();
  return () => {};
}
