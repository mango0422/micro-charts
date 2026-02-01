/**
 * Radar Chart (Spider Chart) - Multi-axis comparative visualization
 *
 * Performance optimizations:
 * - Layout values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via scheduleRender
 * - Polar coordinate calculations cached
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { generateColorPalette } from '../core/colors';
import { HALF_PI, COLOR_GRID, COLOR_TEXT, FONT_FAMILY, FONT_SIZE_SM } from '../core/constants';
import type { AnimationController } from '../types';

export interface RadarChartData {
  axes: Array<{
    label: string;
    max?: number;
  }>;
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
    fill?: boolean;
    fillOpacity?: number;
  }>;
}

export interface RadarChartOptions {
  size?: number;
  levels?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  showLegend?: boolean;
  animate?: boolean;
  duration?: number;
}

type RequiredRadarOptions = Required<RadarChartOptions>;

const DEFAULT_OPTIONS: RequiredRadarOptions = {
  size: 400,
  levels: 5,
  showGrid: true,
  showLabels: true,
  showValues: false,
  showLegend: true,
  animate: true,
  duration: 600,
};

const LEGEND_HEIGHT = 30;

export class RadarChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: RadarChartData;
  private options: RequiredRadarOptions;
  private animationController?: AnimationController;

  // Cached layout values
  private _cx = 0;
  private _cy = 0;
  private _radius = 0;
  private _angleStep = 0;
  private _colors: string[] = [];
  private _axisMaxValues: number[] = [];

  // Style caching
  private _ctxFill: string | null = null;
  private _ctxStroke: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: RadarChartData, options?: RadarChartOptions) {
    if (!container) {
      throw new Error('[micro-charts] RadarChart: container element is required');
    }

    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.size, this.options.size);

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
    const { size, showLegend } = this.options;
    const { axes, datasets } = this.data;

    const legendSpace = showLegend ? LEGEND_HEIGHT : 0;
    this._cx = size / 2;
    this._cy = (size - legendSpace) / 2;
    this._radius = Math.min(this._cx, this._cy) * 0.7;

    this._angleStep = axes.length > 0 ? (Math.PI * 2) / axes.length : 0;

    // Calculate max values for each axis
    this._axisMaxValues.length = axes.length;
    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i]!;
      if (axis.max !== undefined) {
        this._axisMaxValues[i] = axis.max;
      } else {
        // Auto-calculate from datasets
        let max = 1;
        for (let d = 0; d < datasets.length; d++) {
          const val = datasets[d]!.data[i] ?? 0;
          if (val > max) max = val;
        }
        this._axisMaxValues[i] = max;
      }
    }

    // Generate colors
    this._colors = generateColorPalette(datasets.length);
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (p) => this.render(p));
  }

  setData(data: RadarChartData): void {
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

  setOptions(options: Partial<RadarChartOptions>): void {
    const needsResize = options.size !== undefined;

    // Field-by-field update
    if (options.size !== undefined) this.options.size = options.size;
    if (options.levels !== undefined) this.options.levels = options.levels;
    if (options.showGrid !== undefined) this.options.showGrid = options.showGrid;
    if (options.showLabels !== undefined) this.options.showLabels = options.showLabels;
    if (options.showValues !== undefined) this.options.showValues = options.showValues;
    if (options.showLegend !== undefined) this.options.showLegend = options.showLegend;
    if (options.animate !== undefined) this.options.animate = options.animate;
    if (options.duration !== undefined) this.options.duration = options.duration;

    if (needsResize) {
      this.renderer.resize(this.options.size, this.options.size);
      this.resetStyleCache();
    }

    this.updateLayout();
    this.batchRender();
  }

  resize(size: number): void {
    this.options.size = size;
    this.renderer.resize(size, size);
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

  /** Optimized render - style caching, direct ctx access */
  private render(progress: number): void {
    const { size, levels, showGrid, showLabels, showLegend } = this.options;
    const ctx = this.renderer.ctx;
    const { axes, datasets } = this.data;

    this.renderer.clear();

    const cx = this._cx;
    const cy = this._cy;
    const radius = this._radius * progress;
    const angleStep = this._angleStep;
    const colors = this._colors;

    // Draw grid levels
    if (showGrid) {
      this.setStroke(ctx, COLOR_GRID);
      this.setLineWidth(ctx, 1);

      for (let level = 1; level <= levels; level++) {
        const r = radius * (level / levels);
        ctx.beginPath();
        for (let i = 0; i < axes.length; i++) {
          const angle = i * angleStep - HALF_PI;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Draw axes
    if (showGrid || showLabels) {
      this.setStroke(ctx, COLOR_GRID);
      this.setLineWidth(ctx, 1);

      for (let i = 0; i < axes.length; i++) {
        const angle = i * angleStep - HALF_PI;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        if (showGrid) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.stroke();
        }

        if (showLabels && progress === 1) {
          const labelDist = radius + 15;
          const labelX = cx + Math.cos(angle) * labelDist;
          const labelY = cy + Math.sin(angle) * labelDist;

          this.setFill(ctx, COLOR_TEXT);
          ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(axes[i]!.label, labelX, labelY);
        }
      }
    }

    // Draw datasets
    for (let d = 0; d < datasets.length; d++) {
      const dataset = datasets[d]!;
      const color = dataset.color ?? colors[d] ?? '#888';
      const fill = dataset.fill !== undefined ? dataset.fill : true;
      const fillOpacity = dataset.fillOpacity !== undefined ? dataset.fillOpacity : 0.2;

      // Calculate polygon vertices
      ctx.beginPath();
      for (let i = 0; i < axes.length; i++) {
        const value = dataset.data[i] ?? 0;
        const maxValue = this._axisMaxValues[i] ?? 1;
        const normalizedValue = maxValue > 0 ? value / maxValue : 0;
        const r = radius * normalizedValue;

        const angle = i * angleStep - HALF_PI;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Fill
      if (fill) {
        ctx.save();
        ctx.globalAlpha = fillOpacity;
        this.setFill(ctx, color);
        ctx.fill();
        ctx.restore();
      }

      // Stroke
      this.setStroke(ctx, color);
      this.setLineWidth(ctx, 2);
      ctx.stroke();
    }

    // Legend
    if (showLegend && progress === 1) {
      const legendY = size - LEGEND_HEIGHT + 10;
      const boxSize = 12;
      let legendX = 20;

      ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
      ctx.textBaseline = 'middle';

      for (let i = 0; i < datasets.length; i++) {
        const dataset = datasets[i]!;
        const color = dataset.color ?? colors[i] ?? '#888';

        this.setFill(ctx, color);
        ctx.fillRect(legendX, legendY, boxSize, boxSize);

        this.setFill(ctx, COLOR_TEXT);
        ctx.textAlign = 'left';
        ctx.fillText(dataset.label, legendX + boxSize + 4, legendY + boxSize / 2);

        legendX += boxSize + 4 + ctx.measureText(dataset.label).width + 16;
      }
    }
  }
}
