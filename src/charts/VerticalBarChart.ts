/**
 * Vertical Bar Chart - Displays categorical data distributions
 *
 * Performance optimizations:
 * - Layout values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via scheduleRender
 * - Pre-calculated bar rectangles for hit detection
 * - Lazy tooltip creation
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { generateColorPalette } from '../core/colors';
import { COLOR_GRID, COLOR_TEXT, FONT_FAMILY, FONT_SIZE_SM } from '../core/constants';
import type { AnimationController } from '../types';

export interface VerticalBarData {
  label: string;
  value: number;
  color?: string;
}

interface TooltipConfig {
  formatter?: (value: number, data: VerticalBarData) => string;
}

export interface VerticalBarChartOptions {
  width?: number;
  height?: number;
  barThickness?: number;
  barRadius?: number;
  yDomain?: [number, number] | 'auto';
  yTickCount?: number;
  allowDecimals?: boolean;
  showGrid?: boolean;
  gridDash?: number[];
  xAxisHeight?: number;
  tooltip?: TooltipConfig | false;
  animate?: boolean;
  duration?: number;
  onBarHover?: (data: VerticalBarData | null, index: number) => void;
  onBarClick?: (data: VerticalBarData, index: number) => void;
}

type RequiredOptions = Required<Omit<VerticalBarChartOptions, 'tooltip' | 'onBarHover' | 'onBarClick' | 'yDomain'>> & {
  tooltip: TooltipConfig | false;
  onBarHover?: (data: VerticalBarData | null, index: number) => void;
  onBarClick?: (data: VerticalBarData, index: number) => void;
  yDomain: [number, number] | 'auto';
};

const DEFAULT_OPTIONS: RequiredOptions = {
  width: 400,
  height: 300,
  barThickness: 0.6,
  barRadius: 4,
  yDomain: 'auto',
  yTickCount: 5,
  allowDecimals: false,
  showGrid: true,
  gridDash: [3, 3],
  xAxisHeight: 30,
  tooltip: false,
  animate: false,
  duration: 500,
};

const PADDING_LEFT = 40;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;

interface BarRect {
  x: number;
  y: number;
  w: number;
  h: number;
  data: VerticalBarData;
  index: number;
}

export class VerticalBarChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private container: HTMLElement;
  private data: VerticalBarData[];
  private options: RequiredOptions;
  private animationController?: AnimationController;
  private resizeObserver?: ResizeObserver;
  private tooltipEl?: HTMLDivElement;

  // Cached layout values
  private _chartW = 0;
  private _chartH = 0;
  private _colors: string[] = [];
  private _barRects: BarRect[] = [];
  private _maxValue = 0;
  private _yTicks: number[] = [];
  private _hoveredIndex = -1;

  // Style caching
  private _ctxFill: string | null = null;
  private _ctxStroke: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: VerticalBarData[], options?: VerticalBarChartOptions) {
    if (!container) {
      throw new Error('[micro-charts] VerticalBarChart: container element is required');
    }

    this.container = container;
    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.canvas = document.createElement('canvas');
    this.canvas.style.cursor = 'pointer';
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);

    this.setupEventListeners();
    this.setupResizeObserver();
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
    const { width, height, xAxisHeight, yDomain, yTickCount, allowDecimals } = this.options;

    this._chartW = width - PADDING_LEFT - PADDING_RIGHT;
    this._chartH = height - PADDING_TOP - xAxisHeight;

    // Calculate max value
    let maxValue = 1;
    for (let i = 0; i < this.data.length; i++) {
      const val = this.data[i]!.value;
      if (val > maxValue) maxValue = val;
    }

    if (yDomain === 'auto') {
      this._maxValue = maxValue;
    } else {
      this._maxValue = yDomain[1];
    }

    // Generate Y-axis ticks
    this._yTicks = [];
    for (let i = 0; i <= yTickCount; i++) {
      const value = (this._maxValue / yTickCount) * i;
      this._yTicks.push(allowDecimals ? value : Math.round(value));
    }

    // Generate colors
    this._colors = generateColorPalette(this.data.length);

    // Pre-calculate bar rectangles
    this._barRects = [];
    const { barThickness } = this.options;
    const barCount = this.data.length || 1;
    const slotWidth = this._chartW / barCount;
    const barWidth = slotWidth * barThickness;
    const barOffset = (slotWidth - barWidth) / 2;

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      const valueRatio = this._maxValue > 0 ? d.value / this._maxValue : 0;
      const barH = this._chartH * valueRatio;
      const x = PADDING_LEFT + i * slotWidth + barOffset;
      const y = PADDING_TOP + this._chartH - barH;

      this._barRects.push({
        x,
        y,
        w: barWidth,
        h: barH,
        data: d,
        index: i,
      });
    }
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (p) => this.render(p));
  }

  setData(data: VerticalBarData[]): void {
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

  setOptions(options: Partial<VerticalBarChartOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;

    // Field-by-field update
    if (options.width !== undefined) this.options.width = options.width;
    if (options.height !== undefined) this.options.height = options.height;
    if (options.barThickness !== undefined) this.options.barThickness = options.barThickness;
    if (options.barRadius !== undefined) this.options.barRadius = options.barRadius;
    if (options.yDomain !== undefined) this.options.yDomain = options.yDomain;
    if (options.yTickCount !== undefined) this.options.yTickCount = options.yTickCount;
    if (options.allowDecimals !== undefined) this.options.allowDecimals = options.allowDecimals;
    if (options.showGrid !== undefined) this.options.showGrid = options.showGrid;
    if (options.gridDash !== undefined) this.options.gridDash = options.gridDash;
    if (options.xAxisHeight !== undefined) this.options.xAxisHeight = options.xAxisHeight;
    if (options.tooltip !== undefined) this.options.tooltip = options.tooltip;
    if (options.animate !== undefined) this.options.animate = options.animate;
    if (options.duration !== undefined) this.options.duration = options.duration;
    if (options.onBarHover !== undefined) this.options.onBarHover = options.onBarHover;
    if (options.onBarClick !== undefined) this.options.onBarClick = options.onBarClick;

    if (needsResize) {
      this.renderer.resize(this.options.width, this.options.height);
      this.resetStyleCache();
    }

    this.updateLayout();
    this.batchRender();
  }

  resize(width?: number, height?: number): void {
    if (width !== undefined) this.options.width = width;
    if (height !== undefined) this.options.height = height;
    this.renderer.resize(this.options.width, this.options.height);
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
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.tooltipEl) {
      this.tooltipEl.remove();
    }
    this.canvas.remove();
  }

  /** Optimized render - style caching, direct ctx access, cached values */
  private render(progress: number): void {
    const { height, showGrid, gridDash, barRadius, xAxisHeight, allowDecimals } = this.options;
    const ctx = this.renderer.ctx;

    this.renderer.clear();

    const chartX = PADDING_LEFT;
    const chartY = PADDING_TOP;
    const chartW = this._chartW;
    const chartH = this._chartH;
    const colors = this._colors;

    // Grid lines (horizontal, dashed)
    if (showGrid) {
      this.setStroke(ctx, COLOR_GRID);
      this.setLineWidth(ctx, 1);
      ctx.setLineDash(gridDash);

      for (let i = 0; i < this._yTicks.length; i++) {
        const tickValue = this._yTicks[i]!;
        const ratio = this._maxValue > 0 ? tickValue / this._maxValue : 0;
        const y = chartY + chartH * (1 - ratio);

        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartW, y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // Y-axis labels
    this.setFill(ctx, COLOR_TEXT);
    ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this._yTicks.length; i++) {
      const tickValue = this._yTicks[i]!;
      const ratio = this._maxValue > 0 ? tickValue / this._maxValue : 0;
      const y = chartY + chartH * (1 - ratio);
      const label = allowDecimals ? tickValue.toFixed(1) : tickValue.toString();

      ctx.fillText(label, chartX - 8, y);
    }

    // Bars
    for (let i = 0; i < this._barRects.length; i++) {
      const rect = this._barRects[i]!;
      const d = rect.data;
      const color = d.color ?? colors[i] ?? '#888';
      const barH = rect.h * progress;
      const barY = rect.y + (rect.h - barH);
      const isHovered = i === this._hoveredIndex;

      this.setFill(ctx, color);
      ctx.globalAlpha = isHovered ? 0.8 : 1;

      // Draw rounded bar [4, 4, 0, 0] - top corners only
      ctx.beginPath();
      ctx.moveTo(rect.x, barY + barRadius);
      ctx.arcTo(rect.x, barY, rect.x + barRadius, barY, barRadius);
      ctx.lineTo(rect.x + rect.w - barRadius, barY);
      ctx.arcTo(rect.x + rect.w, barY, rect.x + rect.w, barY + barRadius, barRadius);
      ctx.lineTo(rect.x + rect.w, barY + barH);
      ctx.lineTo(rect.x, barY + barH);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // X-axis labels
    this.setFill(ctx, COLOR_TEXT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      const rect = this._barRects[i]!;
      const labelX = rect.x + rect.w / 2;
      const labelY = height - xAxisHeight + 5;

      ctx.fillText(d.label, labelX, labelY);
    }
  }

  // === Event handling ===
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('click', this.handleClick);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    let hoveredIndex = -1;

    // Hit detection using pre-calculated rects
    for (let i = 0; i < this._barRects.length; i++) {
      const r = this._barRects[i]!;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        hoveredIndex = i;
        break;
      }
    }

    if (hoveredIndex !== this._hoveredIndex) {
      this._hoveredIndex = hoveredIndex;
      this.batchRender();

      if (hoveredIndex >= 0) {
        const data = this._barRects[hoveredIndex]!.data;
        this.showTooltip(e.clientX, e.clientY, data);
        if (this.options.onBarHover) {
          this.options.onBarHover(data, hoveredIndex);
        }
      } else {
        this.hideTooltip();
        if (this.options.onBarHover) {
          this.options.onBarHover(null, -1);
        }
      }
    } else if (hoveredIndex >= 0 && this.tooltipEl) {
      // Update tooltip position
      this.tooltipEl.style.left = `${e.clientX + 10}px`;
      this.tooltipEl.style.top = `${e.clientY - 30}px`;
    }
  };

  private handleMouseLeave = (): void => {
    if (this._hoveredIndex >= 0) {
      this._hoveredIndex = -1;
      this.batchRender();
      this.hideTooltip();
      if (this.options.onBarHover) {
        this.options.onBarHover(null, -1);
      }
    }
  };

  private handleClick = (): void => {
    if (this._hoveredIndex >= 0 && this.options.onBarClick) {
      const data = this._barRects[this._hoveredIndex]!.data;
      this.options.onBarClick(data, this._hoveredIndex);
    }
  };

  // === Tooltip ===
  private showTooltip(x: number, y: number, data: VerticalBarData): void {
    if (this.options.tooltip === false) return;

    if (!this.tooltipEl) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.style.position = 'fixed';
      this.tooltipEl.style.background = 'rgba(0, 0, 0, 0.9)';
      this.tooltipEl.style.color = '#fff';
      this.tooltipEl.style.padding = '8px 12px';
      this.tooltipEl.style.borderRadius = '4px';
      this.tooltipEl.style.fontSize = '12px';
      this.tooltipEl.style.pointerEvents = 'none';
      this.tooltipEl.style.zIndex = '9999';
      this.tooltipEl.style.whiteSpace = 'nowrap';
      document.body.appendChild(this.tooltipEl);
    }

    // Clear previous content (XSS safe)
    this.tooltipEl.textContent = '';

    if (this.options.tooltip.formatter) {
      // Use textContent for user-provided formatter output (XSS safe)
      this.tooltipEl.textContent = this.options.tooltip.formatter(data.value, data);
    } else {
      const valueStr = this.options.allowDecimals ? data.value.toFixed(1) : data.value.toString();
      this.tooltipEl.textContent = `${data.label}: ${valueStr}`;
    }
    this.tooltipEl.style.left = `${x + 10}px`;
    this.tooltipEl.style.top = `${y - 30}px`;
    this.tooltipEl.style.display = 'block';
  }

  private hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }
  }

  // === ResizeObserver ===
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0 && width !== this.options.width) {
          this.resize(width, undefined);
        }
      }
    });

    this.resizeObserver.observe(this.container);
  }
}
