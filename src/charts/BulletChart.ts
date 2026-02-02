/**
 * BulletChart - KPI visualization (compact alternative to gauge)
 * Shows value vs target with background range bars
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { COLOR_TEXT, FONT_FAMILY, FONT_SIZE_SM } from '../core/constants';
import type { AnimationController } from '../types';

export interface BulletRange {
  min: number;
  max: number;
  color: string;
}

export interface BulletChartOptions {
  value?: number;
  target?: number;
  ranges?: BulletRange[];
  width?: number;
  height?: number;
  orientation?: 'horizontal' | 'vertical';
  showLabel?: boolean;
  label?: string;
  animate?: boolean;
  duration?: number;
  valueColor?: string;
  targetColor?: string;
}

type RequiredOptions = Required<Omit<BulletChartOptions, 'label'>> & { label?: string };

const DEFAULT_OPTIONS: RequiredOptions = {
  value: 0,
  target: 100,
  ranges: [
    { min: 0, max: 50, color: '#fee2e2' },
    { min: 50, max: 75, color: '#fef3c7' },
    { min: 75, max: 100, color: '#d1fae5' },
  ],
  width: 300,
  height: 40,
  orientation: 'horizontal',
  showLabel: false,
  animate: false,
  duration: 500,
  valueColor: '#1f2937',
  targetColor: '#ef4444',
};

export class BulletChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private options: RequiredOptions;
  private animationController?: AnimationController;
  private _cancelRender?: () => void;
  private _displayValue = 0;

  constructor(container: HTMLElement | null, options?: BulletChartOptions) {
    if (!container) throw new Error('[micro-charts] BulletChart: container is required');

    this.options = { ...DEFAULT_OPTIONS, ...options };
    if (options?.ranges) this.options.ranges = options.ranges;

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);

    if (this.options.animate) {
      this.animateIn();
    } else {
      this._displayValue = this.options.value;
      this.render();
    }
  }

  private render(): void {
    const ctx = this.renderer.ctx;
    const { width, height, ranges, target, orientation, showLabel, label, valueColor, targetColor } = this.options;
    const isHorizontal = orientation === 'horizontal';

    ctx.clearRect(0, 0, width, height);

    const padding = showLabel ? (isHorizontal ? 50 : 25) : 5;
    const chartW = isHorizontal ? width - padding : width - 10;
    const chartH = isHorizontal ? height - 10 : height - padding;
    const startX = isHorizontal ? padding : 5;
    const startY = 5;

    // Calculate scale
    const maxRange = Math.max(...ranges.map(r => r.max), target, this._displayValue);
    const scale = (v: number) => (v / maxRange) * (isHorizontal ? chartW : chartH);

    // Draw range bars
    for (const range of ranges) {
      ctx.fillStyle = range.color;
      const start = scale(range.min);
      const end = scale(range.max);

      if (isHorizontal) {
        ctx.fillRect(startX + start, startY, end - start, chartH);
      } else {
        const y = height - padding - end;
        ctx.fillRect(startX, y, chartW, end - start);
      }
    }

    // Draw value bar
    ctx.fillStyle = valueColor;
    const valueSize = scale(this._displayValue);
    const barThickness = isHorizontal ? chartH * 0.4 : chartW * 0.4;
    const barOffset = (isHorizontal ? chartH : chartW) * 0.3;

    if (isHorizontal) {
      ctx.fillRect(startX, startY + barOffset, valueSize, barThickness);
    } else {
      ctx.fillRect(startX + barOffset, height - padding - valueSize, barThickness, valueSize);
    }

    // Draw target marker
    ctx.fillStyle = targetColor;
    const targetPos = scale(target);
    const markerThickness = 3;
    const markerLength = isHorizontal ? chartH * 0.7 : chartW * 0.7;
    const markerOffset = (isHorizontal ? chartH : chartW) * 0.15;

    if (isHorizontal) {
      ctx.fillRect(startX + targetPos - markerThickness / 2, startY + markerOffset, markerThickness, markerLength);
    } else {
      ctx.fillRect(startX + markerOffset, height - padding - targetPos - markerThickness / 2, markerLength, markerThickness);
    }

    // Draw label
    if (showLabel && label) {
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = `${FONT_SIZE_SM}px ${FONT_FAMILY}`;

      if (isHorizontal) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, padding - 5, height / 2);
      } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, width / 2, height - padding + 5);
      }
    }
  }

  private animateIn(): void {
    if (this.animationController) this.animationController.cancel();
    const target = this.options.value;
    this.animationController = animate(0, target, this.options.duration, (v: number) => {
      this._displayValue = v;
      this.render();
    });
  }

  setData(value: number, target?: number): void {
    this.options.value = value;
    if (target !== undefined) this.options.target = target;

    if (this.animationController) this.animationController.cancel();
    if (this.options.animate) {
      this.animateIn();
    } else {
      this._displayValue = value;
      if (this._cancelRender) this._cancelRender();
      this._cancelRender = scheduleRender(() => this.render());
    }
  }

  setOptions(options: Partial<BulletChartOptions>): void {
    Object.assign(this.options, options);
    if (options.ranges) this.options.ranges = options.ranges;
    if (options.width || options.height) {
      this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);
    }
    this._displayValue = this.options.value;
    this.render();
  }

  destroy(): void {
    if (this.animationController) this.animationController.cancel();
    this.canvas.remove();
  }
}
