/**
 * Heat Map - Displays 2D matrix data with color-coded cells
 *
 * Performance optimizations:
 * - Layout values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via scheduleRender
 * - Color scale function memoized
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { interpolateColor } from '../core/colors';
import { COLOR_TEXT, FONT_FAMILY, FONT_SIZE_SM } from '../core/constants';
import type { AnimationController } from '../types';

export interface HeatMapData {
  rows: string[];
  columns: string[];
  values: number[][];
}

export interface HeatMapOptions {
  width?: number;
  height?: number;
  cellPadding?: number;
  showValues?: boolean;
  colorScheme?: 'sequential' | 'diverging';
  colors?: {
    min?: string;
    mid?: string;
    max?: string;
  };
  min?: number;
  max?: number;
  showAxisLabels?: boolean;
  animate?: boolean;
  duration?: number;
  onCellClick?: (row: number, col: number, value: number) => void;
}

type RequiredHeatMapOptions = Required<Omit<HeatMapOptions, 'onCellClick' | 'min' | 'max'>> & {
  colors: Required<NonNullable<HeatMapOptions['colors']>>;
  min?: number;
  max?: number;
  onCellClick?: (row: number, col: number, value: number) => void;
};

const DEFAULT_OPTIONS: RequiredHeatMapOptions = {
  width: 600,
  height: 400,
  cellPadding: 2,
  showValues: false,
  colorScheme: 'sequential',
  colors: {
    min: '#f0f9ff',
    mid: '#ffffff',
    max: '#1e40af',
  },
  showAxisLabels: true,
  animate: true,
  duration: 400,
};

const LABEL_PADDING = 40;

export class HeatMap {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: HeatMapData;
  private options: RequiredHeatMapOptions;
  private animationController?: AnimationController;
  private clickHandler?: (e: MouseEvent) => void;

  // Cached layout values
  private _cellWidth = 0;
  private _cellHeight = 0;
  private _chartX = 0;
  private _chartY = 0;
  private _minValue = 0;
  private _maxValue = 0;
  private _midValue = 0;

  // Style caching
  private _ctxFill: string | null = null;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: HeatMapData, options?: HeatMapOptions) {
    if (!container) {
      throw new Error('[micro-charts] HeatMap: container element is required');
    }

    this.data = data;
    this.options = this.mergeOptions(options);

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);

    this.updateLayout();
    this.setupClickHandler();

    if (this.options.animate) {
      this.animateIn();
    } else {
      this.render(1);
    }
  }

  // === Style caching helper ===
  private setFill(ctx: CanvasRenderingContext2D, c: string): void {
    if (c !== this._ctxFill) {
      ctx.fillStyle = this._ctxFill = c;
    }
  }

  private resetStyleCache(): void {
    this._ctxFill = null;
  }

  // === Batch rendering ===
  private batchRender(): void {
    if (this._cancelRender) {
      this._cancelRender();
    }
    this._cancelRender = scheduleRender(() => this.render(1));
  }

  private mergeOptions(options?: HeatMapOptions): RequiredHeatMapOptions {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
      colors: { ...DEFAULT_OPTIONS.colors, ...options?.colors },
    };
  }

  /** Cache layout calculations */
  private updateLayout(): void {
    const { width, height, showAxisLabels } = this.options;
    const { rows, columns, values } = this.data;

    const labelSpace = showAxisLabels ? LABEL_PADDING : 0;
    this._chartX = labelSpace;
    this._chartY = 0;

    const chartW = width - labelSpace;
    const chartH = height - labelSpace;

    this._cellWidth = columns.length > 0 ? chartW / columns.length : 0;
    this._cellHeight = rows.length > 0 ? chartH / rows.length : 0;

    // Calculate min/max from data - zero allocation loop
    if (this.options.min !== undefined) {
      this._minValue = this.options.min;
    } else {
      let min = Infinity;
      for (let r = 0; r < values.length; r++) {
        const row = values[r]!;
        for (let c = 0; c < row.length; c++) {
          const val = row[c]!;
          if (val < min) min = val;
        }
      }
      this._minValue = min === Infinity ? 0 : min;
    }

    if (this.options.max !== undefined) {
      this._maxValue = this.options.max;
    } else {
      let max = -Infinity;
      for (let r = 0; r < values.length; r++) {
        const row = values[r]!;
        for (let c = 0; c < row.length; c++) {
          const val = row[c]!;
          if (val > max) max = val;
        }
      }
      this._maxValue = max === -Infinity ? 0 : max;
    }

    this._midValue = (this._minValue + this._maxValue) / 2;
  }

  /** Calculate color for a value */
  private getColorForValue(value: number): string {
    const { colorScheme, colors } = this.options;
    const { _minValue, _maxValue, _midValue } = this;

    if (_maxValue === _minValue) {
      return colors.min;
    }

    if (colorScheme === 'sequential') {
      const t = (_maxValue > _minValue) ? (value - _minValue) / (_maxValue - _minValue) : 0;
      return interpolateColor(colors.min, colors.max, t);
    } else {
      // Diverging
      if (value < _midValue) {
        const t = (_midValue > _minValue) ? (value - _minValue) / (_midValue - _minValue) : 0;
        return interpolateColor(colors.min, colors.mid, t);
      } else {
        const t = (_maxValue > _midValue) ? (value - _midValue) / (_maxValue - _midValue) : 0;
        return interpolateColor(colors.mid, colors.max, t);
      }
    }
  }

  private setupClickHandler(): void {
    if (!this.options.onCellClick) return;

    this.clickHandler = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor((x - this._chartX) / this._cellWidth);
      const row = Math.floor((y - this._chartY) / this._cellHeight);

      if (row >= 0 && row < this.data.rows.length && col >= 0 && col < this.data.columns.length) {
        const value = this.data.values[row]?.[col];
        if (value !== undefined) {
          this.options.onCellClick!(row, col, value);
        }
      }
    };

    this.canvas.addEventListener('click', this.clickHandler);
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (p) => this.render(p));
  }

  setData(data: HeatMapData): void {
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

  setOptions(options: Partial<HeatMapOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;

    // Field-by-field update
    if (options.width !== undefined) this.options.width = options.width;
    if (options.height !== undefined) this.options.height = options.height;
    if (options.cellPadding !== undefined) this.options.cellPadding = options.cellPadding;
    if (options.showValues !== undefined) this.options.showValues = options.showValues;
    if (options.colorScheme !== undefined) this.options.colorScheme = options.colorScheme;
    if (options.min !== undefined) this.options.min = options.min;
    if (options.max !== undefined) this.options.max = options.max;
    if (options.showAxisLabels !== undefined) this.options.showAxisLabels = options.showAxisLabels;
    if (options.animate !== undefined) this.options.animate = options.animate;
    if (options.duration !== undefined) this.options.duration = options.duration;

    if (options.colors) {
      if (options.colors.min !== undefined) this.options.colors.min = options.colors.min;
      if (options.colors.mid !== undefined) this.options.colors.mid = options.colors.mid;
      if (options.colors.max !== undefined) this.options.colors.max = options.colors.max;
    }

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
    if (this.clickHandler) {
      this.canvas.removeEventListener('click', this.clickHandler);
    }
    this.canvas.remove();
  }

  /** Optimized render - style caching, direct ctx access */
  private render(progress: number): void {
    const { height, cellPadding, showValues, showAxisLabels } = this.options;
    const ctx = this.renderer.ctx;
    const { rows, columns, values } = this.data;

    this.renderer.clear();

    const chartX = this._chartX;
    const chartY = this._chartY;
    const cellW = this._cellWidth;
    const cellH = this._cellHeight;

    // Draw cells
    for (let r = 0; r < rows.length; r++) {
      const row = values[r];
      if (!row) continue;

      for (let c = 0; c < columns.length; c++) {
        const value = row[c];
        if (value === undefined) continue;

        const x = chartX + c * cellW;
        const y = chartY + r * cellH;
        const color = this.getColorForValue(value);

        // Fade-in animation via opacity
        ctx.save();
        ctx.globalAlpha = progress;
        this.setFill(ctx, color);
        ctx.fillRect(x + cellPadding / 2, y + cellPadding / 2, cellW - cellPadding, cellH - cellPadding);
        ctx.restore();
      }
    }

    // Draw values
    if (showValues && progress === 1) {
      this.setFill(ctx, COLOR_TEXT);
      ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let r = 0; r < rows.length; r++) {
        const row = values[r];
        if (!row) continue;

        for (let c = 0; c < columns.length; c++) {
          const value = row[c];
          if (value === undefined) continue;

          const x = chartX + c * cellW + cellW / 2;
          const y = chartY + r * cellH + cellH / 2;
          ctx.fillText(Math.round(value).toString(), x, y);
        }
      }
    }

    // Draw axis labels
    if (showAxisLabels && progress === 1) {
      this.setFill(ctx, COLOR_TEXT);
      ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;

      // Row labels (left side)
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < rows.length; r++) {
        ctx.fillText(rows[r]!, chartX - 8, chartY + r * cellH + cellH / 2);
      }

      // Column labels (bottom)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let c = 0; c < columns.length; c++) {
        ctx.fillText(columns[c]!, chartX + c * cellW + cellW / 2, height - LABEL_PADDING + 4);
      }
    }
  }
}
