/**
 * Color utilities
 */

import type { RGB } from '../types';

// Re-export for backwards compatibility
export type { RGB } from '../types';

/** Default color palette for charts */
export const defaultColors = [
  '#4285F4', // Blue
  '#EA4335', // Red
  '#FBBC04', // Yellow
  '#34A853', // Green
  '#FF6D01', // Orange
  '#46BDC6', // Cyan
  '#7B1FA2', // Purple
  '#C2185B', // Pink
] as const;

/** Parse hex color to RGB */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Handle 3-char hex (#RGB)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) return null;

  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

/** Convert RGB to hex string */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Generate a color palette with distinct colors */
export function generateColorPalette(count: number): string[] {
  if (count <= defaultColors.length) {
    return defaultColors.slice(0, count) as unknown as string[];
  }

  // Generate additional colors using HSL
  const colors: string[] = [...defaultColors];
  const hueStep = 360 / (count - defaultColors.length + 1);

  for (let i = defaultColors.length; i < count; i++) {
    const hue = (i - defaultColors.length) * hueStep;
    colors.push(hslToHex(hue, 70, 50));
  }

  return colors;
}

/** Interpolate between two colors */
export function interpolateColor(color1: string, color2: string, t: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

  return rgbToHex(r, g, b);
}

/** Convert HSL to hex (helper for palette generation) */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return rgbToHex(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255));
}
