/**
 * Horizontal Bar Chart - Displays resource utilization metrics
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

export interface HorizontalBarData {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

interface TooltipContent {
  title?: string;
  lines: { label: string; value: string; color?: string }[];
}

interface TooltipConfig {
  formatter?: (value: number, data: HorizontalBarData) => string;
  content?: (data: HorizontalBarData) => TooltipContent;
}

export interface HorizontalBarChartOptions {
  width?: number;
  height?: number;
  barHeight?: number;
  barSpacing?: number;
  barRadius?: number;
  domain?: [number, number];
  showGrid?: boolean;
  gridDash?: number[];
  labelWidth?: number;
  labelFormatter?: (label: string) => string;
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
  tooltip?: TooltipConfig | false;
  animate?: boolean;
  duration?: number;
  onBarHover?: (data: HorizontalBarData | null, index: number) => void;
  onBarClick?: (data: HorizontalBarData, index: number) => void;
}

type RequiredOptions = Required<Omit<HorizontalBarChartOptions, 'tooltip' | 'onBarHover' | 'onBarClick' | 'labelFormatter' | 'valueFormatter'>> & {
  tooltip: TooltipConfig | false;
  onBarHover?: (data: HorizontalBarData | null, index: number) => void;
  onBarClick?: (data: HorizontalBarData, index: number) => void;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number) => string;
};

const DEFAULT_OPTIONS: RequiredOptions = {
  width: 400,
  height: 0, // Auto-calculated
  barHeight: 16,
  barSpacing: 6,
  barRadius: 4,
  domain: [0, 100],
  showGrid: true,
  gridDash: [3, 3],
  labelWidth: 80,
  showValues: true,
  tooltip: false,
  animate: false,
  duration: 500,
};

const PADDING_LEFT = 10;
const PADDING_RIGHT = 60;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 10;

interface BarRect {
  x: number;
  y: number;
  w: number;
  h: number;
  data: HorizontalBarData;
  index: number;
}

export class HorizontalBarChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private container: HTMLElement;
  private data: HorizontalBarData[];
  private options: RequiredOptions;
  private animationController?: AnimationController;
  private resizeObserver?: ResizeObserver;
  private tooltipEl?: HTMLDivElement;

  // Cached layout values
  private _chartW = 0;
  private _colors: string[] = [];
  private _barRects: BarRect[] = [];
  private _hoveredIndex = -1;

  // Style caching
  private _ctxFill: string | null = null;
  private _ctxStroke: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: HorizontalBarData[], options?: HorizontalBarChartOptions) {
    if (!container) {
      throw new Error('[micro-charts] HorizontalBarChart: container element is required');
    }

    this.container = container;
    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Auto-calculate height if not provided
    if (!options?.height) {
      this.options.height = this.calculateHeight();
    }

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

  private calculateHeight(): number {
    const { barHeight, barSpacing } = this.options;
    const barCount = this.data.length || 1;
    return PADDING_TOP + PADDING_BOTTOM + barCount * (barHeight + barSpacing) - barSpacing;
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
    const { width, labelWidth, domain } = this.options;

    this._chartW = width - PADDING_LEFT - labelWidth - PADDING_RIGHT;

    // Generate colors
    this._colors = generateColorPalette(this.data.length);

    // Pre-calculate bar rectangles for hit detection
    this._barRects = [];
    const { barHeight, barSpacing } = this.options;
    const [minDomain, maxDomain] = domain;
    const domainRange = maxDomain - minDomain;

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      const y = PADDING_TOP + i * (barHeight + barSpacing);
      const valueRatio = domainRange > 0 ? (d.value - minDomain) / domainRange : 0;
      const barW = this._chartW * Math.max(0, Math.min(1, valueRatio));

      this._barRects.push({
        x: PADDING_LEFT + labelWidth,
        y,
        w: barW,
        h: barHeight,
        data: d,
        index: i,
      });
    }
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (p) => this.render(p));
  }

  setData(data: HorizontalBarData[]): void {
    this.data = data;

    // Recalculate height if auto
    if (!this.options.height) {
      this.options.height = this.calculateHeight();
      this.renderer.resize(this.options.width, this.options.height);
      this.resetStyleCache();
    }

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

  setOptions(options: Partial<HorizontalBarChartOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;

    // Field-by-field update
    if (options.width !== undefined) this.options.width = options.width;
    if (options.height !== undefined) this.options.height = options.height;
    if (options.barHeight !== undefined) this.options.barHeight = options.barHeight;
    if (options.barSpacing !== undefined) this.options.barSpacing = options.barSpacing;
    if (options.barRadius !== undefined) this.options.barRadius = options.barRadius;
    if (options.domain !== undefined) this.options.domain = options.domain;
    if (options.showGrid !== undefined) this.options.showGrid = options.showGrid;
    if (options.gridDash !== undefined) this.options.gridDash = options.gridDash;
    if (options.labelWidth !== undefined) this.options.labelWidth = options.labelWidth;
    if (options.labelFormatter !== undefined) this.options.labelFormatter = options.labelFormatter;
    if (options.showValues !== undefined) this.options.showValues = options.showValues;
    if (options.valueFormatter !== undefined) this.options.valueFormatter = options.valueFormatter;
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
    const { height, showGrid, gridDash, labelWidth, showValues, valueFormatter, barRadius } = this.options;
    const ctx = this.renderer.ctx;

    this.renderer.clear();

    const chartX = PADDING_LEFT + labelWidth;
    const chartW = this._chartW;
    const colors = this._colors;

    // Grid lines (vertical, dashed)
    if (showGrid) {
      this.setStroke(ctx, COLOR_GRID);
      this.setLineWidth(ctx, 1);
      ctx.setLineDash(gridDash);

      for (let i = 0; i <= 4; i++) {
        const ratio = i / 4;
        const x = chartX + chartW * ratio;
        ctx.beginPath();
        ctx.moveTo(x, PADDING_TOP);
        ctx.lineTo(x, height - PADDING_BOTTOM);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // Bars
    for (let i = 0; i < this._barRects.length; i++) {
      const rect = this._barRects[i]!;
      const d = rect.data;
      const color = d.color ?? colors[i] ?? '#888';
      const barW = rect.w * progress;
      const isHovered = i === this._hoveredIndex;

      this.setFill(ctx, color);
      ctx.globalAlpha = isHovered ? 0.8 : 1;

      // Draw rounded bar [0, 4, 4, 0] - right corners only
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y);
      ctx.lineTo(rect.x + barW - barRadius, rect.y);
      ctx.arcTo(rect.x + barW, rect.y, rect.x + barW, rect.y + barRadius, barRadius);
      ctx.lineTo(rect.x + barW, rect.y + rect.h - barRadius);
      ctx.arcTo(rect.x + barW, rect.y + rect.h, rect.x + barW - barRadius, rect.y + rect.h, barRadius);
      ctx.lineTo(rect.x, rect.y + rect.h);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // Labels (Y-axis)
    this.setFill(ctx, COLOR_TEXT);
    ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      const rect = this._barRects[i]!;
      const label = this.options.labelFormatter ? this.options.labelFormatter(d.label) : d.label;
      const labelY = rect.y + rect.h / 2;

      // Truncate label if needed
      const maxLabelWidth = labelWidth - 10;
      let displayLabel = label;
      if (ctx.measureText(label).width > maxLabelWidth) {
        while (ctx.measureText(displayLabel + '...').width > maxLabelWidth && displayLabel.length > 0) {
          displayLabel = displayLabel.slice(0, -1);
        }
        displayLabel += '...';
      }

      ctx.fillText(displayLabel, chartX - 5, labelY);
    }

    // Values
    if (showValues && progress === 1) {
      this.setFill(ctx, COLOR_TEXT);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < this._barRects.length; i++) {
        const rect = this._barRects[i]!;
        const d = rect.data;
        const valueText = valueFormatter ? valueFormatter(d.value) : `${d.value.toFixed(1)}%`;
        const valueX = rect.x + rect.w + 5;
        const valueY = rect.y + rect.h / 2;

        ctx.fillText(valueText, valueX, valueY);
      }
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
      this.tooltipEl.style.top = `${e.clientY + 10}px`;
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
  private showTooltip(x: number, y: number, data: HorizontalBarData): void {
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

    let content = '';

    if (this.options.tooltip.content) {
      const tooltipContent = this.options.tooltip.content(data);
      if (tooltipContent.title) {
        content += `<div style="font-weight: bold; margin-bottom: 4px;">${tooltipContent.title}</div>`;
      }
      tooltipContent.lines.forEach(line => {
        const colorDot = line.color ? `<span style="display: inline-block; width: 8px; height: 8px; background: ${line.color}; border-radius: 50%; margin-right: 6px;"></span>` : '';
        content += `<div>${colorDot}${line.label}: ${line.value}</div>`;
      });
    } else if (this.options.tooltip.formatter) {
      content = this.options.tooltip.formatter(data.value, data);
    } else {
      content = `${data.label}: ${data.value.toFixed(1)}%`;
    }

    this.tooltipEl.innerHTML = content;
    this.tooltipEl.style.left = `${x + 10}px`;
    this.tooltipEl.style.top = `${y + 10}px`;
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
