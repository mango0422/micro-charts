/**
 * Gauge Chart - Displays single numeric values (0-100% style metrics)
 *
 * Performance optimizations:
 * - Geometry values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via queueMicrotask
 * - No object allocation in render path
 */

import { CanvasRenderer } from '../core/canvas';
import { animate } from '../core/animation';
import {
  GAUGE_START_ANGLE,
  GAUGE_TOTAL_ANGLE,
  GAUGE_END_ANGLE,
  COLOR_TEXT,
  COLOR_BG,
  COLOR_NORMAL,
  COLOR_WARNING,
  COLOR_CRITICAL,
  FONT_FAMILY,
} from '../core/constants';
import type { AnimationController } from '../types';

export interface GaugeChartOptions {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  thickness?: number;
  thresholds?: { warning: number; critical: number };
  colors?: {
    normal?: string;
    warning?: string;
    critical?: string;
    background?: string;
  };
  showValue?: boolean;
  animate?: boolean;
  duration?: number;
}

type RequiredGaugeOptions = Required<Omit<GaugeChartOptions, 'thresholds' | 'colors'>> & {
  thresholds: { warning: number; critical: number };
  colors: Required<NonNullable<GaugeChartOptions['colors']>>;
};

const DEFAULT_OPTIONS: Omit<RequiredGaugeOptions, 'value'> = {
  min: 0,
  max: 100,
  size: 200,
  thickness: 0.2,
  thresholds: { warning: 60, critical: 80 },
  colors: {
    normal: COLOR_NORMAL,
    warning: COLOR_WARNING,
    critical: COLOR_CRITICAL,
    background: COLOR_BG,
  },
  showValue: true,
  animate: true,
  duration: 500,
};

export class GaugeChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private options: RequiredGaugeOptions;
  private currentValue: number;
  private animationController?: AnimationController;

  // Cached geometry values (updated only on resize)
  private _cx = 0;
  private _cy = 0;
  private _arcRadius = 0;
  private _lineWidth = 0;
  private _fontSize = 0;

  // Style caching (avoid redundant ctx state changes)
  private _ctxStroke: string | null = null;
  private _ctxFill: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _pending = false;

  constructor(container: HTMLElement | null, options: GaugeChartOptions) {
    if (!container) {
      throw new Error('[micro-charts] GaugeChart: container element is required');
    }

    this.options = this.mergeOptions(options);
    this.currentValue = this.options.value;

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.size, this.options.size);

    this.updateGeometry();
    this.render(this.currentValue);
  }

  // === Style caching helpers ===
  private setStroke(ctx: CanvasRenderingContext2D, c: string): void {
    if (c !== this._ctxStroke) {
      ctx.strokeStyle = this._ctxStroke = c;
    }
  }

  private setFill(ctx: CanvasRenderingContext2D, c: string): void {
    if (c !== this._ctxFill) {
      ctx.fillStyle = this._ctxFill = c;
    }
  }

  private setLineWidth(ctx: CanvasRenderingContext2D, w: number): void {
    if (w !== this._ctxLw) {
      ctx.lineWidth = this._ctxLw = w;
    }
  }

  private resetStyleCache(): void {
    this._ctxStroke = null;
    this._ctxFill = null;
    this._ctxLw = 0;
  }

  // === Batch rendering ===
  private scheduleRender(): void {
    if (!this._pending) {
      this._pending = true;
      queueMicrotask(() => {
        this._pending = false;
        this.render(this.currentValue);
      });
    }
  }

  /** Cache geometry calculations - only called on resize */
  private updateGeometry(): void {
    const { size, thickness } = this.options;
    this._cx = size / 2;
    this._cy = size / 2;
    const outerRadius = this._cx - 10;
    const innerRadius = outerRadius * (1 - thickness);
    this._lineWidth = outerRadius - innerRadius;
    this._arcRadius = (outerRadius + innerRadius) / 2;
    this._fontSize = size * 0.15;
  }

  private mergeOptions(options: GaugeChartOptions): RequiredGaugeOptions {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
      thresholds: { ...DEFAULT_OPTIONS.thresholds, ...options.thresholds },
      colors: { ...DEFAULT_OPTIONS.colors, ...options.colors },
    };
  }

  setData(value: number): void {
    const { min, max } = this.options;
    const clampedValue = value < min ? min : value > max ? max : value;

    if (this.animationController) {
      this.animationController.cancel();
    }

    if (this.options.animate) {
      this.animationController = animate(
        this.currentValue,
        clampedValue,
        this.options.duration,
        (v) => {
          this.currentValue = v;
          this.render(v);
        },
        () => { this.currentValue = clampedValue; }
      );
    } else {
      this.currentValue = clampedValue;
      this.scheduleRender();  // Batch rendering for non-animated updates
    }
  }

  setOptions(options: Partial<GaugeChartOptions>): void {
    this.options = this.mergeOptions({ ...this.options, ...options });
    if (options.size || options.thickness) {
      this.renderer.resize(this.options.size, this.options.size);
      this.updateGeometry();
    }
    this.scheduleRender();
  }

  destroy(): void {
    if (this.animationController) {
      this.animationController.cancel();
    }
    this.canvas.remove();
  }

  resize(size: number): void {
    this.options.size = size;
    this.renderer.resize(size, size);
    this.updateGeometry();
    this.scheduleRender();
  }

  /** Optimized render - style caching, cached geometry, direct ctx access */
  private render(value: number): void {
    const { colors, showValue, min, max } = this.options;
    const ctx = this.renderer.ctx;

    this.renderer.clear();
    this.resetStyleCache();  // Reset cache after clear

    // Use cached geometry values
    const cx = this._cx;
    const cy = this._cy;
    const arcRadius = this._arcRadius;

    // Background arc
    this.setStroke(ctx, colors.background);
    this.setLineWidth(ctx, this._lineWidth);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, arcRadius, GAUGE_START_ANGLE, GAUGE_END_ANGLE, false);
    ctx.stroke();

    // Value arc
    const range = max - min;
    const percentage = range > 0 ? (value - min) / range : 0;
    const valueAngle = GAUGE_START_ANGLE + GAUGE_TOTAL_ANGLE * percentage;

    if (percentage > 0) {
      this.setStroke(ctx, this.getColor(value));
      ctx.beginPath();
      ctx.arc(cx, cy, arcRadius, GAUGE_START_ANGLE, valueAngle, false);
      ctx.stroke();
    }

    // Center text
    if (showValue) {
      this.setFill(ctx, COLOR_TEXT);
      ctx.font = `bold ${this._fontSize}px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(value)}%`, cx, cy);
    }
  }

  private getColor(value: number): string {
    const { thresholds, colors } = this.options;
    if (value >= thresholds.critical) return colors.critical;
    if (value >= thresholds.warning) return colors.warning;
    return colors.normal;
  }
}
