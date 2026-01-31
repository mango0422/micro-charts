/**
 * Bar Chart - Displays categorical data as horizontal or vertical bars
 *
 * Performance optimizations:
 * - Layout values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via queueMicrotask
 * - Color palette generated once per data update
 */

import { CanvasRenderer } from '../core/canvas';
import { animate } from '../core/animation';
import { generateColorPalette } from '../core/colors';
import { COLOR_GRID, COLOR_TEXT, FONT_FAMILY, FONT_SIZE_MD } from '../core/constants';
import type { AnimationController } from '../types';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartOptions {
  width?: number;
  height?: number;
  orientation?: 'horizontal' | 'vertical';
  max?: number;
  barThickness?: number;
  showValues?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  duration?: number;
}

type RequiredBarOptions = Required<Omit<BarChartOptions, 'max'>> & { max?: number };

const DEFAULT_OPTIONS: RequiredBarOptions = {
  width: 400,
  height: 300,
  orientation: 'vertical',
  barThickness: 0.6,
  showValues: false,
  showGrid: true,
  animate: true,
  duration: 500,
};

const PADDING = 40;

export class BarChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: BarChartData[];
  private options: RequiredBarOptions;
  private animationController?: AnimationController;

  // Cached layout values
  private _chartW = 0;
  private _chartH = 0;
  private _barSpace = 0;
  private _barSize = 0;
  private _colors: string[] = [];
  private _maxValue = 0;

  // Style caching
  private _ctxFill: string | null = null;
  private _ctxStroke: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _pending = false;

  constructor(container: HTMLElement | null, data: BarChartData[], options?: BarChartOptions) {
    if (!container) {
      throw new Error('[micro-charts] BarChart: container element is required');
    }

    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);

    this.updateLayout();

    if (this.options.animate) {
      this.animateIn();
    } else {
      this.render(1);
    }
  }

  // === Style caching helpers ===
  private setFill(ctx: CanvasRenderingContext2D, c: string): void {
    if (c !== this._ctxFill) {
      ctx.fillStyle = this._ctxFill = c;
    }
  }

  private setStroke(ctx: CanvasRenderingContext2D, c: string): void {
    if (c !== this._ctxStroke) {
      ctx.strokeStyle = this._ctxStroke = c;
    }
  }

  private setLineWidth(ctx: CanvasRenderingContext2D, w: number): void {
    if (w !== this._ctxLw) {
      ctx.lineWidth = this._ctxLw = w;
    }
  }

  private resetStyleCache(): void {
    this._ctxFill = null;
    this._ctxStroke = null;
    this._ctxLw = 0;
  }

  // === Batch rendering ===
  private scheduleRender(): void {
    if (!this._pending) {
      this._pending = true;
      queueMicrotask(() => {
        this._pending = false;
        this.render(1);
      });
    }
  }

  /** Cache layout calculations */
  private updateLayout(): void {
    const { width, height, orientation, barThickness } = this.options;
    const isVertical = orientation === 'vertical';

    this._chartW = width - PADDING * 2;
    this._chartH = height - PADDING * 2;

    const barCount = this.data.length || 1;
    this._barSpace = isVertical ? this._chartW / barCount : this._chartH / barCount;
    this._barSize = this._barSpace * barThickness;

    // Calculate max and generate colors
    this._maxValue = this.options.max ?? Math.max(...this.data.map(d => d.value), 1);
    this._colors = generateColorPalette(this.data.length);
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (p) => this.render(p));
  }

  setData(data: BarChartData[]): void {
    this.data = data;
    this.updateLayout();

    if (this.animationController) {
      this.animationController.cancel();
    }

    if (this.options.animate) {
      this.animateIn();
    } else {
      this.scheduleRender();
    }
  }

  setOptions(options: Partial<BarChartOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;

    this.options = { ...this.options, ...options };

    if (needsResize) {
      this.renderer.resize(this.options.width, this.options.height);
    }

    this.updateLayout();
    this.scheduleRender();
  }

  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.renderer.resize(width, height);
    this.updateLayout();
    this.scheduleRender();
  }

  destroy(): void {
    if (this.animationController) {
      this.animationController.cancel();
    }
    this.canvas.remove();
  }

  /** Optimized render - style caching, direct ctx access, cached values */
  private render(progress: number): void {
    const { width, height, orientation, showValues, showGrid } = this.options;
    const ctx = this.renderer.ctx;
    const isVertical = orientation === 'vertical';

    this.renderer.clear();
    this.resetStyleCache();

    const chartW = this._chartW;
    const chartH = this._chartH;
    const barSpace = this._barSpace;
    const barSize = this._barSize;
    const maxValue = this._maxValue;
    const colors = this._colors;
    const data = this.data;

    // Grid
    if (showGrid) {
      this.setStroke(ctx, COLOR_GRID);
      this.setLineWidth(ctx, 1);

      for (let i = 0; i <= 4; i++) {
        const ratio = i / 4;
        ctx.beginPath();
        if (isVertical) {
          const y = PADDING + chartH * (1 - ratio);
          ctx.moveTo(PADDING, y);
          ctx.lineTo(width - PADDING, y);
        } else {
          const x = PADDING + chartW * ratio;
          ctx.moveTo(x, PADDING);
          ctx.lineTo(x, height - PADDING);
        }
        ctx.stroke();
      }
    }

    // Bars
    for (let i = 0; i < data.length; i++) {
      const d = data[i]!;
      const color = d.color ?? colors[i] ?? '#888';
      const valueRatio = maxValue > 0 ? (d.value * progress) / maxValue : 0;

      this.setFill(ctx, color);

      if (isVertical) {
        const x = PADDING + barSpace * i + (barSpace - barSize) / 2;
        const barH = chartH * valueRatio;
        const y = PADDING + chartH - barH;
        ctx.fillRect(x, y, barSize, barH);
      } else {
        const y = PADDING + barSpace * i + (barSpace - barSize) / 2;
        const barW = chartW * valueRatio;
        ctx.fillRect(PADDING, y, barW, barSize);
      }

      // Value labels
      if (showValues && progress === 1) {
        this.setFill(ctx, COLOR_TEXT);
        ctx.font = `${FONT_SIZE_MD}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const val = Math.round(d.value).toString();
        if (isVertical) {
          ctx.fillText(val, PADDING + barSpace * i + barSpace / 2, PADDING + chartH * (1 - valueRatio) - 8);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(val, PADDING + chartW * valueRatio + 8, PADDING + barSpace * i + barSpace / 2);
        }
      }
    }
  }
}
