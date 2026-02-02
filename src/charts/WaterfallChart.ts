/**
 * Waterfall Chart - Cumulative effect visualization
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
import type { AnimationController } from '../types';

export interface WaterfallData {
  label: string;
  value: number;
  isTotal?: boolean;
}

export interface WaterfallChartOptions {
  width?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  showConnectors?: boolean;
  showValues?: boolean;
  showGrid?: boolean;
  colors?: {
    positive?: string;
    negative?: string;
    total?: string;
  };
  animate?: boolean;
  duration?: number;
}

type RequiredOptions = Required<Omit<WaterfallChartOptions, 'colors'>> & {
  colors: Required<NonNullable<WaterfallChartOptions['colors']>>;
};

const DEFAULT_OPTIONS: RequiredOptions = {
  width: 600,
  height: 400,
  barWidth: 60,
  gap: 20,
  showConnectors: true,
  showValues: true,
  showGrid: true,
  colors: {
    positive: '#10b981',
    negative: '#ef4444',
    total: '#3b82f6',
  },
  animate: false,
  duration: 600,
};

const PADDING = { top: 30, right: 20, bottom: 50, left: 60 };

interface CumulativeData {
  start: number;
  end: number;
  value: number;
  isTotal: boolean;
  label: string;
}

export class WaterfallChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: WaterfallData[];
  private options: RequiredOptions;
  private animationController?: AnimationController;

  // Cached layout values
  private _chartX = 0;
  private _chartY = 0;
  private _chartW = 0;
  private _chartH = 0;
  private _yRange: [number, number] = [0, 1];
  private _cumulative: CumulativeData[] = [];

  // Style caching
  private _ctxFill: string | null = null;
  private _ctxStroke: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: WaterfallData[], options?: WaterfallChartOptions) {
    if (!container) throw new Error('[micro-charts] WaterfallChart: container is required');

    this.data = data;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      colors: { ...DEFAULT_OPTIONS.colors, ...options?.colors },
    };

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

    // Calculate cumulative values
    this._cumulative = [];
    let cumulative = 0;

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      if (d.isTotal) {
        // Total bar: from 0 to value
        this._cumulative.push({
          start: 0,
          end: d.value,
          value: d.value,
          isTotal: true,
          label: d.label,
        });
        cumulative = d.value;
      } else {
        const start = cumulative;
        const end = cumulative + d.value;
        this._cumulative.push({
          start,
          end,
          value: d.value,
          isTotal: false,
          label: d.label,
        });
        cumulative = end;
      }
    }

    // Calculate Y range
    let yMin = 0, yMax = 0;
    for (let i = 0; i < this._cumulative.length; i++) {
      const c = this._cumulative[i]!;
      if (c.start < yMin) yMin = c.start;
      if (c.end < yMin) yMin = c.end;
      if (c.start > yMax) yMax = c.start;
      if (c.end > yMax) yMax = c.end;
    }

    // Add padding
    const yPad = (yMax - yMin) * 0.1 || 10;
    this._yRange = [yMin - yPad, yMax + yPad];
  }

  private yScale(val: number): number {
    const [min, max] = this._yRange;
    return this._chartY + this._chartH - ((val - min) / (max - min)) * this._chartH;
  }

  private render(progress: number): void {
    const ctx = this.renderer.ctx;
    const { width, height, barWidth, gap, showConnectors, showValues, showGrid, colors } = this.options;

    ctx.clearRect(0, 0, width, height);
    this._ctxFill = this._ctxStroke = null;
    this._ctxLw = 0;

    if (showGrid) this.renderGrid(ctx);

    // Draw zero line
    const zeroY = this.yScale(0);
    this.setStroke(ctx, COLOR_TEXT);
    this.setLineWidth(ctx, 1);
    ctx.beginPath();
    ctx.moveTo(this._chartX, zeroY);
    ctx.lineTo(this._chartX + this._chartW, zeroY);
    ctx.stroke();

    const totalWidth = this.data.length * barWidth + (this.data.length - 1) * gap;
    const startX = this._chartX + (this._chartW - totalWidth) / 2;

    // Draw bars
    for (let i = 0; i < this._cumulative.length; i++) {
      const c = this._cumulative[i]!;
      const x = startX + i * (barWidth + gap);

      const y1 = this.yScale(c.start);
      const y2 = this.yScale(c.end);
      const animatedY1 = y1 + (y2 - y1) * (1 - progress);
      const barHeight = Math.abs(y2 - y1) * progress;

      // Determine color
      let color: string;
      if (c.isTotal) {
        color = colors.total;
      } else if (c.value >= 0) {
        color = colors.positive;
      } else {
        color = colors.negative;
      }

      // Draw bar
      this.setFill(ctx, color);
      const startY = c.isTotal ? this.yScale(0) + (this.yScale(c.end) - this.yScale(0)) * (1 - progress) : animatedY1;
      ctx.fillRect(x, startY, barWidth, barHeight);

      // Draw connector line
      if (showConnectors && i < this._cumulative.length - 1 && progress === 1) {
        const nextC = this._cumulative[i + 1]!;
        this.setStroke(ctx, '#888');
        this.setLineWidth(ctx, 1);
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x + barWidth, this.yScale(c.end));
        ctx.lineTo(x + barWidth + gap, this.yScale(nextC.isTotal ? 0 : c.end));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw label
      this.setFill(ctx, COLOR_TEXT);
      ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(c.label, x + barWidth / 2, this._chartY + this._chartH + 8);

      // Draw value
      if (showValues && progress === 1) {
        ctx.textBaseline = c.value >= 0 ? 'bottom' : 'top';
        const valueY = c.value >= 0 ? Math.min(y1, y2) - 4 : Math.max(y1, y2) + 4;
        const valueText = c.value >= 0 ? `+${c.value}` : `${c.value}`;
        ctx.fillText(c.isTotal ? String(c.value) : valueText, x + barWidth / 2, valueY);
      }
    }

    // Y-axis labels
    this.renderYAxis(ctx);
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    this.setStroke(ctx, COLOR_GRID);
    this.setLineWidth(ctx, 1);
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= 5; i++) {
      const y = this._chartY + (i / 5) * this._chartH;
      ctx.beginPath();
      ctx.moveTo(this._chartX, y);
      ctx.lineTo(this._chartX + this._chartW, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  private renderYAxis(ctx: CanvasRenderingContext2D): void {
    this.setFill(ctx, COLOR_TEXT);
    ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
      const val = this._yRange[0] + (i / 5) * (this._yRange[1] - this._yRange[0]);
      const y = this._chartY + this._chartH - (i / 5) * this._chartH;
      ctx.fillText(val.toFixed(0), this._chartX - 8, y);
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

  setData(data: WaterfallData[]): void {
    this.data = data;
    this.updateLayout();
    if (this.animationController) this.animationController.cancel();
    if (this.options.animate) this.animateIn();
    else this.batchRender();
  }

  setOptions(options: Partial<WaterfallChartOptions>): void {
    if (options.colors) {
      this.options.colors = { ...this.options.colors, ...options.colors };
    }
    Object.assign(this.options, options);
    this.updateLayout();
    this.batchRender();
  }

  destroy(): void {
    if (this.animationController) this.animationController.cancel();
    this.canvas.remove();
  }
}
