/**
 * Multi-Line Time Series Chart - Displays multiple data series over time
 *
 * Performance optimizations:
 * - Layout values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via scheduleRender
 * - Binary search for hit detection
 * - Pre-calculated line paths
 * - Lazy tooltip creation
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { COLOR_GRID, COLOR_TEXT, FONT_FAMILY, FONT_SIZE_SM } from '../core/constants';
import type { AnimationController } from '../types';

/**
 * Row-based data format (backward compatible)
 * Each object represents a data point with timestamp and series values
 */
export interface MultiLineData {
  timestamp: number;
  [key: string]: number | null;
}

/**
 * Column-based data format (performance optimized)
 * Separate arrays for timestamps and each series
 */
export interface ColumnBasedData {
  timestamps: number[];
  series: {
    [key: string]: (number | null)[];
  };
}

export interface SeriesConfig {
  key: string;
  name: string;
  color: string;
  id?: string;
}

interface TooltipEntry {
  key: string;
  name: string;
  value: number;
  color: string;
}

interface TooltipConfig {
  filter?: (value: number | null, key: string) => boolean;
  sort?: (a: TooltipEntry, b: TooltipEntry) => number;
  valueFormatter?: (value: number, key: string) => string;
  labelFormatter?: (timestamp: number) => string;
  nameMap?: Map<string, string>;
  maxHeight?: number;
}

interface XAxisConfig {
  dataKey?: string;
  tickFormatter?: (value: number) => string;
  tickCount?: number;
  hide?: boolean;
}

interface YAxisConfig {
  tickFormatter?: (value: number) => string;
  domain?: [number | 'auto', number | 'auto'];
  width?: number;
  hide?: boolean;
}

export interface MultiLineChartOptions {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  series: SeriesConfig[];
  defaultColors?: string[];
  lineWidth?: number;
  lineType?: 'linear' | 'monotone' | 'step';
  connectNulls?: boolean;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
  showGrid?: boolean;
  gridDash?: number[];
  tooltip?: TooltipConfig | false;
  animate?: boolean;
  duration?: number;
  onPointHover?: (data: MultiLineData | null, index: number) => void;
}

type RequiredOptions = Required<Omit<MultiLineChartOptions, 'tooltip' | 'onPointHover' | 'xAxis' | 'yAxis' | 'defaultColors'>> & {
  tooltip: TooltipConfig | false;
  onPointHover?: (data: MultiLineData | null, index: number) => void;
  xAxis: Required<Omit<XAxisConfig, 'tickFormatter'>> & Pick<XAxisConfig, 'tickFormatter'>;
  yAxis: Required<Omit<YAxisConfig, 'tickFormatter'>> & Pick<YAxisConfig, 'tickFormatter'>;
  defaultColors?: string[];
};

const DEFAULT_OPTIONS: RequiredOptions = {
  width: 600,
  height: 300,
  margin: { top: 20, right: 20, bottom: 30, left: 70 },
  series: [],
  lineWidth: 1.5,
  lineType: 'linear',
  connectNulls: true,
  xAxis: {
    dataKey: 'timestamp',
    tickCount: 5,
    hide: false,
  },
  yAxis: {
    domain: ['auto', 'auto'],
    width: 70,
    hide: false,
  },
  showGrid: true,
  gridDash: [3, 3],
  tooltip: false,
  animate: false,
  duration: 500,
};

interface ProcessedSeries {
  config: SeriesConfig;
  values: (number | null)[];
  points: Array<{ x: number; y: number; value: number }>;
}

export class MultiLineChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private container: HTMLElement;
  private columnData: ColumnBasedData; // Internal columnar storage for performance
  private options: RequiredOptions;
  private animationController?: AnimationController;
  private resizeObserver?: ResizeObserver;
  private tooltipEl?: HTMLDivElement;

  // Cached layout values
  private _chartX = 0;
  private _chartY = 0;
  private _chartW = 0;
  private _chartH = 0;
  private _timestamps: number[] = [];
  private _xRange: [number, number] = [0, 1];
  private _yRange: [number, number] = [0, 1];
  private _yTicks: number[] = [];
  private _xTicks: number[] = [];
  private _processedSeries: ProcessedSeries[] = [];
  private _hoveredIndex = -1;

  // Style caching
  private _ctxFill: string | null = null;
  private _ctxStroke: string | null = null;
  private _ctxLw = 0;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: MultiLineData[] | ColumnBasedData, options: MultiLineChartOptions) {
    if (!container) {
      throw new Error('[micro-charts] MultiLineChart: container element is required');
    }

    this.container = container;

    // Convert to columnar format internally for performance
    this.columnData = Array.isArray(data) ? this.rowToColumn(data) : data;

    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      xAxis: { ...DEFAULT_OPTIONS.xAxis, ...options.xAxis },
      yAxis: { ...DEFAULT_OPTIONS.yAxis, ...options.yAxis },
      margin: { ...DEFAULT_OPTIONS.margin, ...options.margin },
    };

    this.canvas = document.createElement('canvas');
    this.canvas.style.cursor = 'crosshair';
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

  // === Data conversion ===
  /**
   * Convert row-based data to columnar format for better performance
   * This reduces object allocations and improves cache locality
   */
  private rowToColumn(rows: MultiLineData[]): ColumnBasedData {
    if (rows.length === 0) {
      return { timestamps: [], series: {} };
    }

    const timestamps: number[] = [];
    const series: Record<string, (number | null)[]> = {};

    // Extract all unique keys (excluding timestamp)
    const keys = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      for (const key in row) {
        if (key !== 'timestamp') {
          keys.add(key);
        }
      }
    }

    // Initialize series arrays
    for (const key of keys) {
      series[key] = [];
    }

    // Populate columnar data
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      timestamps.push(row.timestamp);

      for (const key of keys) {
        series[key]!.push(row[key] ?? null);
      }
    }

    return { timestamps, series };
  }

  /**
   * Convert columnar data back to row-based format
   * Used for backward compatibility (e.g., tooltips)
   */
  private columnToRow(index: number): MultiLineData | null {
    const { timestamps, series } = this.columnData;

    if (index < 0 || index >= timestamps.length) {
      return null;
    }

    const row: MultiLineData = { timestamp: timestamps[index]! };

    for (const key in series) {
      row[key] = series[key]![index] ?? null;
    }

    return row;
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
    const { width, height, margin, series, yAxis } = this.options;

    this._chartX = margin.left;
    this._chartY = margin.top;
    this._chartW = width - margin.left - margin.right;
    this._chartH = height - margin.top - margin.bottom;

    // Use columnar data directly (already sorted by timestamp during conversion)
    const { timestamps } = this.columnData;

    // Create sorted index array based on timestamps
    const indices = new Array(timestamps.length);
    for (let i = 0; i < timestamps.length; i++) {
      indices[i] = i;
    }
    indices.sort((a, b) => timestamps[a]! - timestamps[b]!);

    // Sort timestamps
    this._timestamps = indices.map(i => timestamps[i]!);

    if (this._timestamps.length === 0) {
      this._xRange = [0, 1];
      this._yRange = [0, 1];
      this._processedSeries = [];
      return;
    }

    // Calculate X range
    this._xRange = [this._timestamps[0]!, this._timestamps[this._timestamps.length - 1]!];

    // Process each series using columnar data
    this._processedSeries = [];
    let yMin = Infinity;
    let yMax = -Infinity;

    for (let seriesIdx = 0; seriesIdx < series.length; seriesIdx++) {
      const config = series[seriesIdx]!;
      const seriesData = this.columnData.series[config.key];
      const values: (number | null)[] = [];
      const points: Array<{ x: number; y: number; value: number }> = [];

      // Use sorted indices to access columnar data
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i]!;
        const val = seriesData?.[idx];
        const normalizedVal = val !== undefined ? val : null;
        values.push(normalizedVal);

        if (normalizedVal !== null) {
          if (normalizedVal < yMin) yMin = normalizedVal;
          if (normalizedVal > yMax) yMax = normalizedVal;
        }
      }

      this._processedSeries.push({ config, values, points });
    }

    // Calculate Y range
    if (yAxis.domain[0] === 'auto') {
      this._yRange[0] = Math.min(0, yMin === Infinity ? 0 : yMin);
    } else {
      this._yRange[0] = yAxis.domain[0];
    }

    if (yAxis.domain[1] === 'auto') {
      this._yRange[1] = (yMax === -Infinity ? 1 : yMax) * 1.1; // 10% padding
    } else {
      this._yRange[1] = yAxis.domain[1];
    }

    // Calculate ticks
    this.calculateTicks();

    // Calculate scaled points for each series
    for (let i = 0; i < this._processedSeries.length; i++) {
      const series = this._processedSeries[i]!;
      series.points = [];

      for (let j = 0; j < series.values.length; j++) {
        const val = series.values[j];
        const timestamp = this._timestamps[j];
        if (val !== null && val !== undefined && timestamp !== undefined) {
          const x = this.xScale(timestamp);
          const y = this.yScale(val);
          series.points.push({ x, y, value: val });
        }
      }
    }
  }

  private calculateTicks(): void {
    const { xAxis } = this.options;

    // X-axis ticks
    this._xTicks = [];
    const tickCount = xAxis.tickCount;
    for (let i = 0; i < tickCount; i++) {
      const ratio = i / (tickCount - 1);
      const timestamp = this._xRange[0] + (this._xRange[1] - this._xRange[0]) * ratio;
      this._xTicks.push(timestamp);
    }

    // Y-axis ticks
    this._yTicks = [];
    const yTickCount = 5;
    for (let i = 0; i <= yTickCount; i++) {
      const value = this._yRange[0] + (this._yRange[1] - this._yRange[0]) * (i / yTickCount);
      this._yTicks.push(value);
    }
  }

  private xScale(timestamp: number): number {
    const range = this._xRange[1] - this._xRange[0];
    if (range === 0) return this._chartX;
    return this._chartX + ((timestamp - this._xRange[0]) / range) * this._chartW;
  }

  private yScale(value: number): number {
    const range = this._yRange[1] - this._yRange[0];
    if (range === 0) return this._chartY + this._chartH / 2;
    return this._chartY + this._chartH - ((value - this._yRange[0]) / range) * this._chartH;
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (p) => this.render(p));
  }

  setData(data: MultiLineData[] | ColumnBasedData): void {
    // Convert to columnar format internally
    this.columnData = Array.isArray(data) ? this.rowToColumn(data) : data;
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

  setSeries(series: SeriesConfig[]): void {
    this.options.series = series;
    this.updateLayout();
    this.batchRender();
  }

  setOptions(options: Partial<MultiLineChartOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;

    // Field-by-field update
    if (options.width !== undefined) this.options.width = options.width;
    if (options.height !== undefined) this.options.height = options.height;
    if (options.margin !== undefined) this.options.margin = { ...this.options.margin, ...options.margin };
    if (options.series !== undefined) this.options.series = options.series;
    if (options.defaultColors !== undefined) this.options.defaultColors = options.defaultColors;
    if (options.lineWidth !== undefined) this.options.lineWidth = options.lineWidth;
    if (options.lineType !== undefined) this.options.lineType = options.lineType;
    if (options.connectNulls !== undefined) this.options.connectNulls = options.connectNulls;
    if (options.xAxis !== undefined) this.options.xAxis = { ...this.options.xAxis, ...options.xAxis };
    if (options.yAxis !== undefined) this.options.yAxis = { ...this.options.yAxis, ...options.yAxis };
    if (options.showGrid !== undefined) this.options.showGrid = options.showGrid;
    if (options.gridDash !== undefined) this.options.gridDash = options.gridDash;
    if (options.tooltip !== undefined) this.options.tooltip = options.tooltip;
    if (options.animate !== undefined) this.options.animate = options.animate;
    if (options.duration !== undefined) this.options.duration = options.duration;
    if (options.onPointHover !== undefined) this.options.onPointHover = options.onPointHover;

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
    const { showGrid, gridDash, lineWidth, xAxis, yAxis } = this.options;
    const ctx = this.renderer.ctx;

    this.renderer.clear();

    const chartX = this._chartX;
    const chartY = this._chartY;
    const chartW = this._chartW;
    const chartH = this._chartH;

    // Grid lines (horizontal)
    if (showGrid) {
      this.setStroke(ctx, COLOR_GRID);
      this.setLineWidth(ctx, 1);
      ctx.setLineDash(gridDash);

      for (let i = 0; i < this._yTicks.length; i++) {
        const value = this._yTicks[i]!;
        const y = this.yScale(value);

        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartW, y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // Y-axis
    if (!yAxis.hide) {
      this.setFill(ctx, COLOR_TEXT);
      ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < this._yTicks.length; i++) {
        const value = this._yTicks[i]!;
        const y = this.yScale(value);
        const label = yAxis.tickFormatter
          ? yAxis.tickFormatter(value)
          : value.toFixed(1);

        ctx.fillText(label, chartX - 8, y);
      }
    }

    // X-axis
    if (!xAxis.hide) {
      this.setFill(ctx, COLOR_TEXT);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let i = 0; i < this._xTicks.length; i++) {
        const timestamp = this._xTicks[i]!;
        const x = this.xScale(timestamp);
        const label = xAxis.tickFormatter
          ? xAxis.tickFormatter(timestamp)
          : new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        ctx.fillText(label, x, chartY + chartH + 5);
      }
    }

    // Lines
    this.setLineWidth(ctx, lineWidth);

    for (let i = 0; i < this._processedSeries.length; i++) {
      const series = this._processedSeries[i]!;
      if (series.points.length === 0) continue;

      this.setStroke(ctx, series.config.color);

      const maxPoints = Math.floor(series.points.length * progress);

      ctx.beginPath();
      ctx.moveTo(series.points[0]!.x, series.points[0]!.y);

      for (let j = 1; j < maxPoints; j++) {
        const point = series.points[j]!;
        ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
    }

    // Hover dots
    if (this._hoveredIndex >= 0 && progress === 1) {
      for (let i = 0; i < this._processedSeries.length; i++) {
        const series = this._processedSeries[i]!;
        const value = series.values[this._hoveredIndex];
        const timestamp = this._timestamps[this._hoveredIndex];

        if (value !== null && value !== undefined && timestamp !== undefined) {
          const x = this.xScale(timestamp);
          const y = this.yScale(value);

          this.setFill(ctx, series.config.color);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // === Event handling ===
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);

    // Binary search for nearest timestamp
    const hoveredIndex = this.findNearestIndex(x);

    if (hoveredIndex !== this._hoveredIndex) {
      this._hoveredIndex = hoveredIndex;
      this.batchRender();

      if (hoveredIndex >= 0) {
        const data = this.columnToRow(hoveredIndex);
        if (data) {
          this.showTooltip(e.clientX, e.clientY, data);
          if (this.options.onPointHover) {
            this.options.onPointHover(data, hoveredIndex);
          }
        }
      } else {
        this.hideTooltip();
        if (this.options.onPointHover) {
          this.options.onPointHover(null, -1);
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
      if (this.options.onPointHover) {
        this.options.onPointHover(null, -1);
      }
    }
  };

  private findNearestIndex(mouseX: number): number {
    if (this._timestamps.length === 0) return -1;

    const xValues = this._timestamps.map(t => this.xScale(t));

    let lo = 0;
    let hi = xValues.length - 1;

    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (xValues[mid]! < mouseX) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    // Check which neighbor is closer
    const index = lo > 0 && Math.abs(xValues[lo - 1]! - mouseX) < Math.abs(xValues[lo]! - mouseX)
      ? lo - 1
      : lo;

    return index;
  }

  // === Tooltip ===
  private showTooltip(x: number, y: number, data: MultiLineData): void {
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
      this.tooltipEl.style.maxHeight = '300px';
      this.tooltipEl.style.overflowY = 'auto';
      document.body.appendChild(this.tooltipEl);
    }

    const tooltip = this.options.tooltip;
    let content = '';

    // Label (timestamp)
    const labelText = tooltip.labelFormatter
      ? tooltip.labelFormatter(data.timestamp)
      : new Date(data.timestamp).toLocaleString();

    content += `<div style="font-weight: bold; margin-bottom: 6px;">${labelText}</div>`;

    // Collect entries
    const entries: TooltipEntry[] = [];
    for (let i = 0; i < this.options.series.length; i++) {
      const series = this.options.series[i]!;
      const value = data[series.key];

      if (value !== null && value !== undefined) {
        if (tooltip.filter && !tooltip.filter(value, series.key)) {
          continue;
        }

        entries.push({
          key: series.key,
          name: tooltip.nameMap ? (tooltip.nameMap.get(series.key) ?? series.name) : series.name,
          value: value as number,
          color: series.color,
        });
      }
    }

    // Sort entries
    if (tooltip.sort) {
      entries.sort(tooltip.sort);
    }

    // Render entries
    for (const entry of entries) {
      const valueText = tooltip.valueFormatter
        ? tooltip.valueFormatter(entry.value, entry.key)
        : entry.value.toFixed(1);

      const colorDot = `<span style="display: inline-block; width: 8px; height: 8px; background: ${entry.color}; border-radius: 50%; margin-right: 6px;"></span>`;
      content += `<div style="margin-bottom: 2px;">${colorDot}${entry.name}: ${valueText}</div>`;
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
