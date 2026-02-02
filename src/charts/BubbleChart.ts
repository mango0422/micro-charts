/**
 * Bubble Chart - 3-dimensional scatter plot visualization
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

export interface BubbleData {
  label: string;
  x: number;
  y: number;
  size: number;
  color?: string;
}

export interface BubbleChartOptions {
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  sizeLabel?: string;
  minRadius?: number;
  maxRadius?: number;
  sizeMode?: 'radius' | 'area';
  showGrid?: boolean;
  showLabels?: boolean;
  showAxes?: boolean;
  animate?: boolean;
  duration?: number;
  onBubbleClick?: (index: number, bubble: BubbleData) => void;
}

type RequiredOptions = Required<Omit<BubbleChartOptions, 'onBubbleClick' | 'xLabel' | 'yLabel' | 'sizeLabel'>> & {
  onBubbleClick?: (index: number, bubble: BubbleData) => void;
  xLabel?: string;
  yLabel?: string;
  sizeLabel?: string;
};

const DEFAULT_OPTIONS: RequiredOptions = {
  width: 600,
  height: 400,
  minRadius: 5,
  maxRadius: 50,
  sizeMode: 'area',
  showGrid: true,
  showLabels: true,
  showAxes: true,
  animate: false,
  duration: 600,
};

const PADDING = { top: 20, right: 30, bottom: 50, left: 60 };

export class BubbleChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: BubbleData[];
  private options: RequiredOptions;
  private animationController?: AnimationController;

  // Cached layout values
  private _chartX = 0;
  private _chartY = 0;
  private _chartW = 0;
  private _chartH = 0;
  private _xRange: [number, number] = [0, 1];
  private _yRange: [number, number] = [0, 1];
  private _sizeRange: [number, number] = [0, 1];
  private _colors: string[] = [];

  // Style caching
  private _ctxFill: string | null = null;
  private _ctxStroke: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: BubbleData[], options?: BubbleChartOptions) {
    if (!container) throw new Error('[micro-charts] BubbleChart: container is required');

    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);

    this.setupEventListeners();
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

    if (this.data.length === 0) return;

    // Calculate ranges
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let sizeMin = Infinity, sizeMax = -Infinity;

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      if (d.x < xMin) xMin = d.x;
      if (d.x > xMax) xMax = d.x;
      if (d.y < yMin) yMin = d.y;
      if (d.y > yMax) yMax = d.y;
      if (d.size < sizeMin) sizeMin = d.size;
      if (d.size > sizeMax) sizeMax = d.size;
    }

    // Add padding to ranges
    const xPad = (xMax - xMin) * 0.1 || 1;
    const yPad = (yMax - yMin) * 0.1 || 1;
    this._xRange = [xMin - xPad, xMax + xPad];
    this._yRange = [yMin - yPad, yMax + yPad];
    this._sizeRange = [sizeMin, sizeMax];

    // Generate colors
    this._colors = generateColorPalette(this.data.length);
  }

  private xScale(val: number): number {
    const [min, max] = this._xRange;
    return this._chartX + ((val - min) / (max - min)) * this._chartW;
  }

  private yScale(val: number): number {
    const [min, max] = this._yRange;
    return this._chartY + this._chartH - ((val - min) / (max - min)) * this._chartH;
  }

  private sizeScale(val: number): number {
    const { minRadius, maxRadius, sizeMode } = this.options;
    const [min, max] = this._sizeRange;
    const ratio = max === min ? 0.5 : (val - min) / (max - min);
    const scaledSize = minRadius + ratio * (maxRadius - minRadius);
    return sizeMode === 'area' ? Math.sqrt(scaledSize * scaledSize / Math.PI) * Math.sqrt(Math.PI) : scaledSize;
  }

  private render(progress: number): void {
    const ctx = this.renderer.ctx;
    const { width, height, showGrid, showAxes, showLabels } = this.options;

    ctx.clearRect(0, 0, width, height);
    this._ctxFill = this._ctxStroke = null;
    this._ctxLw = 0;

    if (showGrid) this.renderGrid(ctx);
    if (showAxes) this.renderAxes(ctx);

    // Draw bubbles
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      const cx = this.xScale(d.x);
      const cy = this.yScale(d.y);
      const radius = this.sizeScale(d.size) * progress;
      const color = d.color || this._colors[i] || '#3b82f6';

      // Fill bubble
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.setFill(ctx, color + '80'); // 50% opacity
      ctx.fill();

      // Stroke bubble
      this.setStroke(ctx, color);
      this.setLineWidth(ctx, 2);
      ctx.stroke();

      // Label
      if (showLabels && progress === 1) {
        this.setFill(ctx, COLOR_TEXT);
        ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.label, cx, cy);
      }
    }
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    this.setStroke(ctx, COLOR_GRID);
    this.setLineWidth(ctx, 1);
    ctx.setLineDash([3, 3]);

    // Vertical lines
    for (let i = 0; i <= 5; i++) {
      const x = this._chartX + (i / 5) * this._chartW;
      ctx.beginPath();
      ctx.moveTo(x, this._chartY);
      ctx.lineTo(x, this._chartY + this._chartH);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= 5; i++) {
      const y = this._chartY + (i / 5) * this._chartH;
      ctx.beginPath();
      ctx.moveTo(this._chartX, y);
      ctx.lineTo(this._chartX + this._chartW, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  private renderAxes(ctx: CanvasRenderingContext2D): void {
    this.setFill(ctx, COLOR_TEXT);
    ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 5; i++) {
      const val = this._xRange[0] + (i / 5) * (this._xRange[1] - this._xRange[0]);
      const x = this._chartX + (i / 5) * this._chartW;
      ctx.fillText(val.toFixed(0), x, this._chartY + this._chartH + 5);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const val = this._yRange[0] + (i / 5) * (this._yRange[1] - this._yRange[0]);
      const y = this._chartY + this._chartH - (i / 5) * this._chartH;
      ctx.fillText(val.toFixed(0), this._chartX - 5, y);
    }

    // Axis labels
    if (this.options.xLabel) {
      ctx.textAlign = 'center';
      ctx.fillText(this.options.xLabel, this._chartX + this._chartW / 2, this._chartY + this._chartH + 30);
    }
    if (this.options.yLabel) {
      ctx.save();
      ctx.translate(15, this._chartY + this._chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(this.options.yLabel, 0, 0);
      ctx.restore();
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

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', this.handleClick);
  }

  private handleClick = (e: MouseEvent): void => {
    if (!this.options.onBubbleClick) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      const cx = this.xScale(d.x);
      const cy = this.yScale(d.y);
      const radius = this.sizeScale(d.size);
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        this.options.onBubbleClick(i, d);
        return;
      }
    }
  };

  setData(data: BubbleData[]): void {
    this.data = data;
    this.updateLayout();
    if (this.animationController) this.animationController.cancel();
    if (this.options.animate) this.animateIn();
    else this.batchRender();
  }

  setOptions(options: Partial<BubbleChartOptions>): void {
    Object.assign(this.options, options);
    this.updateLayout();
    this.batchRender();
  }

  destroy(): void {
    if (this.animationController) this.animationController.cancel();
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.remove();
  }
}
