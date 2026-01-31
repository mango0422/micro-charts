/**
 * Mathematical utilities for coordinate transformations and scaling
 */

import type { Point, PolarCoord } from '../types';

// Re-export types for backwards compatibility
export type { Point, PolarCoord } from '../types';

/** Convert polar coordinates to Cartesian */
export function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number): Point {
  const angleRad = degreesToRadians(angleDegrees);
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/** Convert Cartesian coordinates to polar */
export function cartesianToPolar(cx: number, cy: number, x: number, y: number): PolarCoord {
  const dx = x - cx;
  const dy = y - cy;
  return {
    radius: Math.sqrt(dx * dx + dy * dy),
    angle: radiansToDegrees(Math.atan2(dy, dx)),
  };
}

/** Linear scale: map value from one range to another */
export function linearScale(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Convert degrees to radians */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/** Convert radians to degrees */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/** Linear interpolation */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
