/**
 * Stacked Bar Chart - Displays multi-series categorical data in stacked bars
 *
 * Performance optimizations:
 * - Layout values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via scheduleRender
 * - Zero-allocation max calculation
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { generateColorPalette } from '../core/colors';
import { COLOR_GRID, COLOR_TEXT, FONT_FAMILY, FONT_SIZE_SM } from '../core/constants';
import type { AnimationController } from '../types';

export interface StackedBarData {
  categories: string[];
  series: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

export interface StackedBarOptions {
  width?: number;
  height?: number;
  orientation?: 'horizontal' | 'vertical';
  barThickness?: number;
  showValues?: boolean;
  showTotal?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  duration?: number;
  stacked100?: boolean;
}

type RequiredStackedBarOptions = Required<StackedBarOptions>;

const DEFAULT_OPTIONS: RequiredStackedBarOptions = {
  width: 500,
  height: 300,
  orientation: 'vertical',
  barThickness: 0.7,
  showValues: false,
  showTotal: true,
  showLegend: true,
  showGrid: true,
  animate: true,
  duration: 600,
  stacked100: false,
};

const PADDING = 50;
const LEGEND_HEIGHT = 30;

export class StackedBarChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: StackedBarData;
  private options: RequiredStackedBarOptions;
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
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: StackedBarData, options?: StackedBarOptions) {
    if (!container) {
      throw new Error('[micro-charts] StackedBarChart: container element is required');
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
  private batchRender(): void {
    if (this._cancelRender) {
      this._cancelRender();
    }
    this._cancelRender = scheduleRender(() => this.render(1));
  }

  /** Cache layout calculations */
  private updateLayout(): void {
    const { width, height, orientation, barThickness, showLegend } = this.options;
    const isVertical = orientation === 'vertical';

    const legendSpace = showLegend ? LEGEND_HEIGHT : 0;
    this._chartW = width - PADDING * 2;
    this._chartH = height - PADDING * 2 - legendSpace;

    const barCount = this.data.categories.length || 1;
    this._barSpace = isVertical ? this._chartW / barCount : this._chartH / barCount;
    this._barSize = this._barSpace * barThickness;

    // Calculate max - zero allocation loop
    if (this.options.stacked100) {
      this._maxValue = 100;
    } else {
      let max = 1;
      for (let catIdx = 0; catIdx < this.data.categories.length; catIdx++) {
        let sum = 0;
        for (let seriesIdx = 0; seriesIdx < this.data.series.length; seriesIdx++) {
          sum += this.data.series[seriesIdx]!.data[catIdx] ?? 0;
        }
        if (sum > max) max = sum;
      }
      this._maxValue = max;
    }

    // Generate colors
    this._colors = generateColorPalette(this.data.series.length);
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (p) => this.render(p));
  }

  setData(data: StackedBarData): void {
    this.data = data;
    this.updateLayout();

    if (this.animationController) {
      this.animationController.cancel();
    }

    if (this.options.animate) {
      this.animateIn();
    } else {
      this.batchRender();
    }
  }

  setOptions(options: Partial<StackedBarOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;

    // Field-by-field update
    if (options.width !== undefined) this.options.width = options.width;
    if (options.height !== undefined) this.options.height = options.height;
    if (options.orientation !== undefined) this.options.orientation = options.orientation;
    if (options.barThickness !== undefined) this.options.barThickness = options.barThickness;
    if (options.showValues !== undefined) this.options.showValues = options.showValues;
    if (options.showTotal !== undefined) this.options.showTotal = options.showTotal;
    if (options.showLegend !== undefined) this.options.showLegend = options.showLegend;
    if (options.showGrid !== undefined) this.options.showGrid = options.showGrid;
    if (options.animate !== undefined) this.options.animate = options.animate;
    if (options.duration !== undefined) this.options.duration = options.duration;
    if (options.stacked100 !== undefined) this.options.stacked100 = options.stacked100;

    if (needsResize) {
      this.renderer.resize(this.options.width, this.options.height);
      this.resetStyleCache();
    }

    this.updateLayout();
    this.batchRender();
  }

  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.renderer.resize(width, height);
    this.resetStyleCache();
    this.updateLayout();
    this.batchRender();
  }

  destroy(): void {
    if (this.animationController) {
      this.animationController.cancel();
    }
    if (this._cancelRender) {
      this._cancelRender();
    }
    this.canvas.remove();
  }

  /** Optimized render - style caching, direct ctx access, cached values */
  private render(progress: number): void {
    const { width, height, orientation, showTotal, showGrid, showLegend, stacked100 } = this.options;
    const ctx = this.renderer.ctx;
    const isVertical = orientation === 'vertical';

    this.renderer.clear();

    const chartW = this._chartW;
    const chartH = this._chartH;
    const barSpace = this._barSpace;
    const barSize = this._barSize;
    const maxValue = this._maxValue;
    const colors = this._colors;
    const { categories, series } = this.data;

    const legendSpace = showLegend ? LEGEND_HEIGHT : 0;

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
          ctx.lineTo(x, height - PADDING - legendSpace);
        }
        ctx.stroke();
      }
    }

    // Stacked bars
    for (let catIdx = 0; catIdx < categories.length; catIdx++) {
      let currentOffset = 0;
      let categoryTotal = 0;

      // Calculate category total for stacked100 mode
      if (stacked100) {
        for (let seriesIdx = 0; seriesIdx < series.length; seriesIdx++) {
          categoryTotal += series[seriesIdx]!.data[catIdx] ?? 0;
        }
      }

      // Draw segments
      for (let seriesIdx = 0; seriesIdx < series.length; seriesIdx++) {
        const s = series[seriesIdx]!;
        const value = s.data[catIdx] ?? 0;
        const displayValue = stacked100 && categoryTotal > 0 ? (value / categoryTotal) * 100 : value;
        const color = s.color ?? colors[seriesIdx] ?? '#888';

        const valueRatio = maxValue > 0 ? (displayValue * progress) / maxValue : 0;

        this.setFill(ctx, color);

        if (isVertical) {
          const x = PADDING + barSpace * catIdx + (barSpace - barSize) / 2;
          const segmentH = chartH * valueRatio;
          const y = PADDING + chartH - currentOffset - segmentH;
          ctx.fillRect(x, y, barSize, segmentH);
          currentOffset += segmentH;
        } else {
          const y = PADDING + barSpace * catIdx + (barSpace - barSize) / 2;
          const segmentW = chartW * valueRatio;
          ctx.fillRect(PADDING + currentOffset, y, segmentW, barSize);
          currentOffset += segmentW;
        }
      }

      // Show total
      if (showTotal && progress === 1) {
        const total = stacked100 ? 100 : categoryTotal || series.reduce((sum, s) => sum + (s.data[catIdx] ?? 0), 0);
        this.setFill(ctx, COLOR_TEXT);
        ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
        ctx.textBaseline = 'middle';

        if (isVertical) {
          ctx.textAlign = 'center';
          ctx.fillText(Math.round(total).toString(), PADDING + barSpace * catIdx + barSpace / 2, PADDING + chartH - currentOffset - 8);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(Math.round(total).toString(), PADDING + currentOffset + 4, PADDING + barSpace * catIdx + barSpace / 2);
        }
      }
    }

    // Legend
    if (showLegend && progress === 1) {
      const legendY = height - legendSpace + 10;
      const boxSize = 12;
      let legendX = PADDING;

      ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
      ctx.textBaseline = 'middle';

      for (let i = 0; i < series.length; i++) {
        const s = series[i]!;
        const color = s.color ?? colors[i] ?? '#888';

        this.setFill(ctx, color);
        ctx.fillRect(legendX, legendY, boxSize, boxSize);

        this.setFill(ctx, COLOR_TEXT);
        ctx.textAlign = 'left';
        ctx.fillText(s.label, legendX + boxSize + 4, legendY + boxSize / 2);

        legendX += boxSize + 4 + ctx.measureText(s.label).width + 16;
      }
    }
  }
}
