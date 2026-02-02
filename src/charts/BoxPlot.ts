/**
 * Box Plot - Statistical distribution visualization
 *
 * Performance optimizations:
 * - Layout values cached on resize
 * - Style caching (only set when changed)
 * - Batch rendering via scheduleRender
 * - Zero-allocation loops
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { COLOR_GRID, COLOR_TEXT, FONT_FAMILY, FONT_SIZE_SM } from '../core/constants';
import { generateColorPalette } from '../core/colors';
import type { AnimationController } from '../types';

export interface BoxPlotData {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
  color?: string;
}

export interface BoxPlotOptions {
  width?: number;
  height?: number;
  boxWidth?: number;
  orientation?: 'vertical' | 'horizontal';
  showOutliers?: boolean;
  showMean?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  duration?: number;
}

type RequiredOptions = Required<BoxPlotOptions>;

const DEFAULT_OPTIONS: RequiredOptions = {
  width: 600,
  height: 400,
  boxWidth: 60,
  orientation: 'vertical',
  showOutliers: true,
  showMean: false,
  showGrid: true,
  animate: false,
  duration: 500,
};

const PADDING = { top: 30, right: 30, bottom: 50, left: 60 };

export class BoxPlot {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: BoxPlotData[];
  private options: RequiredOptions;
  private animationController?: AnimationController;

  // Cached layout values
  private _chartX = 0;
  private _chartY = 0;
  private _chartW = 0;
  private _chartH = 0;
  private _valueRange: [number, number] = [0, 1];
  private _colors: string[] = [];

  // Style caching
  private _ctxFill: string | null = null;
  private _ctxStroke: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: BoxPlotData[], options?: BoxPlotOptions) {
    if (!container) throw new Error('[micro-charts] BoxPlot: container is required');

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

  private setFill(ctx: CanvasRenderingContext2D, c: string): void {
    if (c !== this._ctxFill) ctx.fillStyle = this._ctxFill = c;
  }

  private setStroke(ctx: CanvasRenderingContext2D, c: string): void {
    if (c !== this._ctxStroke) ctx.strokeStyle = this._ctxStroke = c;
  }

  private setLineWidth(ctx: CanvasRenderingContext2D, w: number): void {
    if (w !== this._ctxLw) ctx.lineWidth = this._ctxLw = w;
  }

  private batchRender(): void {
    if (this._cancelRender) this._cancelRender();
    this._cancelRender = scheduleRender(() => this.render(1));
  }

  private updateLayout(): void {
    const { width, height } = this.options;

    this._chartX = PADDING.left;
    this._chartY = PADDING.top;
    this._chartW = width - PADDING.left - PADDING.right;
    this._chartH = height - PADDING.top - PADDING.bottom;

    // Calculate value range
    let vMin = Infinity, vMax = -Infinity;

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      if (d.min < vMin) vMin = d.min;
      if (d.max > vMax) vMax = d.max;
      if (d.outliers) {
        for (let j = 0; j < d.outliers.length; j++) {
          const o = d.outliers[j]!;
          if (o < vMin) vMin = o;
          if (o > vMax) vMax = o;
        }
      }
    }

    const pad = (vMax - vMin) * 0.1 || 10;
    this._valueRange = [vMin - pad, vMax + pad];
    this._colors = generateColorPalette(this.data.length);
  }

  private valueScale(val: number): number {
    const [min, max] = this._valueRange;
    if (this.options.orientation === 'vertical') {
      return this._chartY + this._chartH - ((val - min) / (max - min)) * this._chartH;
    } else {
      return this._chartX + ((val - min) / (max - min)) * this._chartW;
    }
  }

  private render(progress: number): void {
    const ctx = this.renderer.ctx;
    const { width, height, boxWidth, orientation, showOutliers, showMean, showGrid } = this.options;

    ctx.clearRect(0, 0, width, height);
    this._ctxFill = this._ctxStroke = null;
    this._ctxLw = 0;

    if (showGrid) this.renderGrid(ctx);
    this.renderAxis(ctx);

    const isVertical = orientation === 'vertical';
    const gap = 20;
    const totalWidth = this.data.length * boxWidth + (this.data.length - 1) * gap;
    const startPos = isVertical
      ? this._chartX + (this._chartW - totalWidth) / 2
      : this._chartY + (this._chartH - totalWidth) / 2;

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      const color = d.color || this._colors[i] || '#3b82f6';
      const pos = startPos + i * (boxWidth + gap);
      const centerPos = pos + boxWidth / 2;

      // Calculate positions with animation
      const medianVal = this.valueScale(d.median);
      const q1Val = this.valueScale(d.q1);
      const q3Val = this.valueScale(d.q3);
      const minVal = this.valueScale(d.min);
      const maxVal = this.valueScale(d.max);

      // Animate from median outward
      const animQ1 = medianVal + (q1Val - medianVal) * progress;
      const animQ3 = medianVal + (q3Val - medianVal) * progress;
      const animMin = medianVal + (minVal - medianVal) * progress;
      const animMax = medianVal + (maxVal - medianVal) * progress;

      this.setStroke(ctx, color);
      this.setLineWidth(ctx, 2);

      if (isVertical) {
        // Whiskers
        ctx.beginPath();
        ctx.moveTo(centerPos, animMax);
        ctx.lineTo(centerPos, animQ3);
        ctx.moveTo(centerPos, animQ1);
        ctx.lineTo(centerPos, animMin);
        ctx.stroke();

        // Whisker caps
        ctx.beginPath();
        ctx.moveTo(pos + boxWidth * 0.25, animMax);
        ctx.lineTo(pos + boxWidth * 0.75, animMax);
        ctx.moveTo(pos + boxWidth * 0.25, animMin);
        ctx.lineTo(pos + boxWidth * 0.75, animMin);
        ctx.stroke();

        // Box
        const boxTop = Math.min(animQ1, animQ3);
        const boxHeight = Math.abs(animQ1 - animQ3);
        this.setFill(ctx, color + '40');
        ctx.fillRect(pos, boxTop, boxWidth, boxHeight);
        ctx.strokeRect(pos, boxTop, boxWidth, boxHeight);

        // Median line
        this.setLineWidth(ctx, 3);
        ctx.beginPath();
        ctx.moveTo(pos, medianVal);
        ctx.lineTo(pos + boxWidth, medianVal);
        ctx.stroke();

        // Mean marker
        if (showMean) {
          const mean = (d.min + d.q1 + d.median + d.q3 + d.max) / 5;
          const meanY = this.valueScale(mean);
          this.setFill(ctx, color);
          ctx.beginPath();
          ctx.arc(centerPos, meanY, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Outliers
        if (showOutliers && d.outliers && progress === 1) {
          this.setFill(ctx, color);
          for (let j = 0; j < d.outliers.length; j++) {
            const oy = this.valueScale(d.outliers[j]!);
            ctx.beginPath();
            ctx.arc(centerPos, oy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Label
        this.setFill(ctx, COLOR_TEXT);
        ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.label, centerPos, this._chartY + this._chartH + 8);
      } else {
        // Horizontal orientation
        ctx.beginPath();
        ctx.moveTo(animMax, centerPos);
        ctx.lineTo(animQ3, centerPos);
        ctx.moveTo(animQ1, centerPos);
        ctx.lineTo(animMin, centerPos);
        ctx.stroke();

        // Whisker caps
        ctx.beginPath();
        ctx.moveTo(animMax, pos + boxWidth * 0.25);
        ctx.lineTo(animMax, pos + boxWidth * 0.75);
        ctx.moveTo(animMin, pos + boxWidth * 0.25);
        ctx.lineTo(animMin, pos + boxWidth * 0.75);
        ctx.stroke();

        // Box
        const boxLeft = Math.min(animQ1, animQ3);
        const boxW = Math.abs(animQ1 - animQ3);
        this.setFill(ctx, color + '40');
        ctx.fillRect(boxLeft, pos, boxW, boxWidth);
        ctx.strokeRect(boxLeft, pos, boxW, boxWidth);

        // Median line
        this.setLineWidth(ctx, 3);
        ctx.beginPath();
        ctx.moveTo(medianVal, pos);
        ctx.lineTo(medianVal, pos + boxWidth);
        ctx.stroke();

        // Label
        this.setFill(ctx, COLOR_TEXT);
        ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.label, this._chartX - 8, centerPos);
      }
    }
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    this.setStroke(ctx, COLOR_GRID);
    this.setLineWidth(ctx, 1);
    ctx.setLineDash([3, 3]);

    const isVertical = this.options.orientation === 'vertical';

    for (let i = 0; i <= 5; i++) {
      if (isVertical) {
        const y = this._chartY + (i / 5) * this._chartH;
        ctx.beginPath();
        ctx.moveTo(this._chartX, y);
        ctx.lineTo(this._chartX + this._chartW, y);
        ctx.stroke();
      } else {
        const x = this._chartX + (i / 5) * this._chartW;
        ctx.beginPath();
        ctx.moveTo(x, this._chartY);
        ctx.lineTo(x, this._chartY + this._chartH);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
  }

  private renderAxis(ctx: CanvasRenderingContext2D): void {
    this.setFill(ctx, COLOR_TEXT);
    ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;

    const isVertical = this.options.orientation === 'vertical';

    for (let i = 0; i <= 5; i++) {
      const val = this._valueRange[0] + (i / 5) * (this._valueRange[1] - this._valueRange[0]);

      if (isVertical) {
        const y = this._chartY + this._chartH - (i / 5) * this._chartH;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toFixed(0), this._chartX - 8, y);
      } else {
        const x = this._chartX + (i / 5) * this._chartW;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(val.toFixed(0), x, this._chartY + this._chartH + 8);
      }
    }
  }

  private animateIn(): void {
    if (this.animationController) this.animationController.cancel();
    this.animationController = animate(
      0,
      1,
      this.options.duration,
      (progress: number) => this.render(progress)
    );
  }

  setData(data: BoxPlotData[]): void {
    this.data = data;
    this.updateLayout();
    if (this.animationController) this.animationController.cancel();
    if (this.options.animate) this.animateIn();
    else this.batchRender();
  }

  setOptions(options: Partial<BoxPlotOptions>): void {
    Object.assign(this.options, options);
    this.updateLayout();
    this.batchRender();
  }

  destroy(): void {
    if (this.animationController) this.animationController.cancel();
    this.canvas.remove();
  }
}

/** Helper function to calculate box plot statistics from raw data */
export function calculateBoxPlotStats(values: number[]): Omit<BoxPlotData, 'label'> {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Idx = Math.floor(n * 0.25);
  const medianIdx = Math.floor(n * 0.5);
  const q3Idx = Math.floor(n * 0.75);

  const q1 = sorted[q1Idx]!;
  const median = sorted[medianIdx]!;
  const q3 = sorted[q3Idx]!;
  const iqr = q3 - q1;

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const outliers: number[] = [];
  let min = Infinity, max = -Infinity;

  for (let i = 0; i < n; i++) {
    const v = sorted[i]!;
    if (v < lowerFence || v > upperFence) {
      outliers.push(v);
    } else {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  return { min, q1, median, q3, max, outliers };
}
