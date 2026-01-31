/**
 * Common types for micro-charts library
 * Minimal type definitions - performance first
 */

/** Point coordinates */
export interface Point {
  x: number;
  y: number;
}

/** Polar coordinates */
export interface PolarCoord {
  radius: number;
  angle: number;
}

/** Animation easing function type */
export type EasingFunction = (t: number) => number;

/** Animation controller for cancellation */
export interface AnimationController {
  cancel: () => void;
}

/** RGB color representation */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Check if code is running in browser environment */
export const isBrowser = typeof window !== 'undefined';

/** Get device pixel ratio with SSR safety */
export const getDevicePixelRatio = (): number => {
  if (!isBrowser) return 1;
  return window.devicePixelRatio || 1;
};
