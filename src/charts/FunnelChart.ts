/**
 * Funnel Chart - Conversion/drop-off visualization
 *
 * Performance optimizations:
 * - Layout values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via scheduleRender
 * - Trapezoid coordinates pre-calculated
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { generateColorPalette } from '../core/colors';
import { COLOR_TEXT, FONT_FAMILY, FONT_SIZE_MD, FONT_SIZE_SM } from '../core/constants';
import type { AnimationController } from '../types';

export type FunnelChartData = Array<{
  label: string;
  value: number;
  color?: string;
}>;

export interface FunnelChartOptions {
  width?: number;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  neckRatio?: number;
  gap?: number;
  showLabels?: boolean;
  showValues?: boolean;
  showPercentage?: boolean;
  animate?: boolean;
  duration?: number;
  onStageClick?: (index: number, stage: FunnelChartData[number]) => void;
}

type RequiredFunnelOptions = Required<Omit<FunnelChartOptions, 'onStageClick'>> & {
  onStageClick?: (index: number, stage: FunnelChartData[number]) => void;
};

const DEFAULT_OPTIONS: RequiredFunnelOptions = {
  width: 500,
  height: 400,
  orientation: 'vertical',
  neckRatio: 0.3,
  gap: 4,
  showLabels: true,
  showValues: true,
  showPercentage: true,
  animate: true,
  duration: 600,
};

interface StageGeometry {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  centerX: number;
  centerY: number;
}

export class FunnelChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: FunnelChartData;
  private options: RequiredFunnelOptions;
  private animationController?: AnimationController;
  private clickHandler?: (e: MouseEvent) => void;

  // Cached layout values
  private _colors: string[] = [];
  private _stageGeometry: StageGeometry[] = [];

  // Style caching
  private _ctxFill: string | null = null;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: FunnelChartData, options?: FunnelChartOptions) {
    if (!container) {
      throw new Error('[micro-charts] FunnelChart: container element is required');
    }

    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };

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

  /** Cache layout calculations */
  private updateLayout(): void {
    const { width, height, orientation, neckRatio, gap } = this.options;
    const isVertical = orientation === 'vertical';

    // Calculate max - zero allocation loop
    let max = 1;
    for (let i = 0; i < this.data.length; i++) {
      const val = this.data[i]!.value;
      if (val > max) max = val;
    }

    // Generate colors
    this._colors = generateColorPalette(this.data.length);

    // Calculate stage geometries
    this._stageGeometry.length = this.data.length;

    const stageCount = this.data.length || 1;
    const totalGap = gap * (stageCount - 1);

    if (isVertical) {
      const stageHeight = (height - totalGap) / stageCount;
      const topWidth = width * 0.9;
      const neckWidth = topWidth * neckRatio;
      const centerX = width / 2;

      for (let i = 0; i < this.data.length; i++) {
        const value = this.data[i]!.value;
        const widthRatio = value / max;

        const currentWidthAtTop = topWidth - (topWidth - neckWidth) * (i / (stageCount - 1 || 1));
        const currentWidthAtBottom = topWidth - (topWidth - neckWidth) * ((i + 1) / (stageCount - 1 || 1));

        const currentWidth = currentWidthAtTop * widthRatio;
        const nextWidth = currentWidthAtBottom * widthRatio;

        const y = i * (stageHeight + gap);

        const geom = this._stageGeometry[i] ?? {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 0, y: 0 },
          bottomLeft: { x: 0, y: 0 },
          bottomRight: { x: 0, y: 0 },
          centerX: 0,
          centerY: 0,
        };

        geom.topLeft = { x: centerX - currentWidth / 2, y };
        geom.topRight = { x: centerX + currentWidth / 2, y };
        geom.bottomLeft = { x: centerX - nextWidth / 2, y: y + stageHeight };
        geom.bottomRight = { x: centerX + nextWidth / 2, y: y + stageHeight };
        geom.centerX = centerX;
        geom.centerY = y + stageHeight / 2;

        this._stageGeometry[i] = geom;
      }
    } else {
      // Horizontal orientation
      const stageWidth = (width - totalGap) / stageCount;
      const topHeight = height * 0.9;
      const neckHeight = topHeight * neckRatio;
      const centerY = height / 2;

      for (let i = 0; i < this.data.length; i++) {
        const value = this.data[i]!.value;
        const heightRatio = value / max;

        const currentHeightAtLeft = topHeight - (topHeight - neckHeight) * (i / (stageCount - 1 || 1));
        const currentHeightAtRight = topHeight - (topHeight - neckHeight) * ((i + 1) / (stageCount - 1 || 1));

        const currentHeight = currentHeightAtLeft * heightRatio;
        const nextHeight = currentHeightAtRight * heightRatio;

        const x = i * (stageWidth + gap);

        const geom = this._stageGeometry[i] ?? {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 0, y: 0 },
          bottomLeft: { x: 0, y: 0 },
          bottomRight: { x: 0, y: 0 },
          centerX: 0,
          centerY: 0,
        };

        geom.topLeft = { x, y: centerY - currentHeight / 2 };
        geom.topRight = { x: x + stageWidth, y: centerY - nextHeight / 2 };
        geom.bottomRight = { x: x + stageWidth, y: centerY + nextHeight / 2 };
        geom.bottomLeft = { x, y: centerY + currentHeight / 2 };
        geom.centerX = x + stageWidth / 2;
        geom.centerY = centerY;

        this._stageGeometry[i] = geom;
      }
    }
  }

  private setupClickHandler(): void {
    if (!this.options.onStageClick) return;

    this.clickHandler = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check which stage was clicked (simple point-in-trapezoid test)
      for (let i = 0; i < this._stageGeometry.length; i++) {
        const geom = this._stageGeometry[i]!;
        const stage = this.data[i]!;

        // Simple bounding box test
        const minX = Math.min(geom.topLeft.x, geom.topRight.x, geom.bottomLeft.x, geom.bottomRight.x);
        const maxX = Math.max(geom.topLeft.x, geom.topRight.x, geom.bottomLeft.x, geom.bottomRight.x);
        const minY = Math.min(geom.topLeft.y, geom.topRight.y, geom.bottomLeft.y, geom.bottomRight.y);
        const maxY = Math.max(geom.topLeft.y, geom.topRight.y, geom.bottomLeft.y, geom.bottomRight.y);

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          this.options.onStageClick!(i, stage);
          break;
        }
      }
    };

    this.canvas.addEventListener('click', this.clickHandler);
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (p) => this.render(p));
  }

  setData(data: FunnelChartData): void {
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

  setOptions(options: Partial<FunnelChartOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;

    // Field-by-field update
    if (options.width !== undefined) this.options.width = options.width;
    if (options.height !== undefined) this.options.height = options.height;
    if (options.orientation !== undefined) this.options.orientation = options.orientation;
    if (options.neckRatio !== undefined) this.options.neckRatio = options.neckRatio;
    if (options.gap !== undefined) this.options.gap = options.gap;
    if (options.showLabels !== undefined) this.options.showLabels = options.showLabels;
    if (options.showValues !== undefined) this.options.showValues = options.showValues;
    if (options.showPercentage !== undefined) this.options.showPercentage = options.showPercentage;
    if (options.animate !== undefined) this.options.animate = options.animate;
    if (options.duration !== undefined) this.options.duration = options.duration;

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
    const { showLabels, showValues, showPercentage } = this.options;
    const ctx = this.renderer.ctx;

    this.renderer.clear();

    const colors = this._colors;
    const geometries = this._stageGeometry;

    // Draw trapezoids
    for (let i = 0; i < this.data.length; i++) {
      const stage = this.data[i]!;
      const geom = geometries[i]!;
      const color = stage.color ?? colors[i] ?? '#888';

      // Animate by scaling from center
      const scale = progress;
      const cx = geom.centerX;
      const cy = geom.centerY;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      this.setFill(ctx, color);
      ctx.beginPath();
      ctx.moveTo(geom.topLeft.x, geom.topLeft.y);
      ctx.lineTo(geom.topRight.x, geom.topRight.y);
      ctx.lineTo(geom.bottomRight.x, geom.bottomRight.y);
      ctx.lineTo(geom.bottomLeft.x, geom.bottomLeft.y);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Draw labels and values
    if (progress === 1) {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      for (let i = 0; i < this.data.length; i++) {
        const stage = this.data[i]!;
        const geom = geometries[i]!;

        this.setFill(ctx, COLOR_TEXT);

        let textY = geom.centerY;

        if (showLabels) {
          ctx.font = `${FONT_SIZE_MD}px ${FONT_FAMILY}`;
          ctx.fillText(stage.label, geom.centerX, textY);
          textY += 16;
        }

        if (showValues) {
          ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
          // Format number: use toLocaleString for thousands separator, max 2 decimal places
          const formattedValue = Number.isInteger(stage.value)
            ? stage.value.toLocaleString()
            : stage.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
          ctx.fillText(formattedValue, geom.centerX, textY);
          textY += 14;
        }

        if (showPercentage && i > 0) {
          const prevValue = this.data[i - 1]!.value;
          const percentage = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : '0';
          ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;
          ctx.fillText(`${percentage}%`, geom.centerX, textY);
        }
      }
    }
  }
}
