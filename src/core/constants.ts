/**
 * Shared constants for micro-charts
 * Performance: Pre-computed values and object pools
 */

// === Object Pools (avoid allocation) ===
export const EMPTY_OBJ: Readonly<Record<string, never>> = Object.freeze({});
export const EMPTY_ARR: readonly never[] = Object.freeze([]);

// === Math Constants (pre-computed) ===
export const PI = Math.PI;
export const TWO_PI = PI * 2;
export const HALF_PI = PI / 2;
export const DEG_TO_RAD = PI / 180;
export const RAD_TO_DEG = 180 / PI;

// === Common Angles (radians) ===
export const ANGLE_0 = 0;
export const ANGLE_90 = HALF_PI;
export const ANGLE_180 = PI;
export const ANGLE_270 = PI + HALF_PI;
export const ANGLE_360 = TWO_PI;

// === GaugeChart specific ===
export const GAUGE_START_ANGLE = 135 * DEG_TO_RAD;  // Bottom-left
export const GAUGE_END_ANGLE = 45 * DEG_TO_RAD;     // Bottom-right
export const GAUGE_TOTAL_ANGLE = 270 * DEG_TO_RAD;  // 270 degrees arc

// === Default Colors (uPlot-compatible theme) ===
export const COLOR_TEXT = '#000';       // uPlot: black text
export const COLOR_GRID = '#eee';       // uPlot: #eee grid
export const COLOR_BG = '#eee';         // Background same as grid
export const COLOR_AXIS = '#000';       // Axis stroke
export const COLOR_TICK = '#eee';       // Tick marks

// === Gauge threshold colors ===
export const COLOR_NORMAL = '#2196F3';  // Blue (healthy)
export const COLOR_WARNING = '#FF9800'; // Orange (warning)
export const COLOR_CRITICAL = '#F44336'; // Red (critical)

// === Default palette (8 colors - uPlot-style muted tones) ===
export const DEFAULT_COLORS = Object.freeze([
  '#2196F3', // Blue
  '#F44336', // Red
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#795548', // Brown
  '#607D8B', // Blue Gray
] as const);

// === Font (uPlot-compatible) ===
export const FONT_FAMILY = 'system-ui, -apple-system, Arial, sans-serif';
export const FONT_SIZE_SM = 10;
export const FONT_SIZE_MD = 12;
export const FONT_SIZE_LG = 14;
