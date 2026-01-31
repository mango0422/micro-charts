/**
 * micro-charts - Lightweight, Canvas-based chart library
 * Zero dependencies, high performance
 */

// Version
export const VERSION = '0.1.0';

// Types
export type {
  AnimationController,
  EasingFunction,
  Point,
  PolarCoord,
  RGB,
} from './types';

// Core utilities
export { CanvasRenderer } from './core/canvas';
export type { CanvasContext } from './core/canvas';

export {
  cartesianToPolar,
  clamp,
  degreesToRadians,
  lerp,
  linearScale,
  polarToCartesian,
  radiansToDegrees,
} from './core/math';

export { animate, easing } from './core/animation';
export type { EasingFn } from './core/animation';

export {
  defaultColors,
  generateColorPalette,
  hexToRgb,
  interpolateColor,
  rgbToHex,
} from './core/colors';

// Chart components
export { GaugeChart } from './charts/GaugeChart';
export type { GaugeChartOptions } from './charts/GaugeChart';

export { PieChart } from './charts/PieChart';
export type { PieChartData, PieChartOptions } from './charts/PieChart';

export { BarChart } from './charts/BarChart';
export type { BarChartData, BarChartOptions } from './charts/BarChart';

export { ProgressBar } from './charts/ProgressBar';
export type { ProgressBarOptions } from './charts/ProgressBar';
