/**
 * Progress Bar - Displays progress as a horizontal bar
 *
 * Performance optimizations:
 * - Direct ctx access in render
 * - Style caching (only set when changed)
 * - Batch rendering via queueMicrotask
 * - Inline roundRect for fewer function calls
 * - Cached font size
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { COLOR_TEXT, FONT_FAMILY } from '../core/constants';
import type { AnimationController } from '../types';

export interface ProgressBarOptions {
  value: number;
  max?: number;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animate?: boolean;
  duration?: number;
  borderRadius?: number;
}

type RequiredProgressOptions = Required<ProgressBarOptions>;

const DEFAULT_OPTIONS: Omit<RequiredProgressOptions, 'value'> = {
  max: 100,
  width: 300,
  height: 20,
  color: '#3b82f6',
  backgroundColor: '#e5e7eb',
  showPercentage: true,
  animate: false,
  duration: 400,
  borderRadius: 4,
};

export class ProgressBar {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private options: RequiredProgressOptions;
  private currentValue: number;
  private animationController?: AnimationController;

  // Cached values
  private _fontSize = 0;

  // Style caching
  private _ctxFill: string | null = null;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, options: ProgressBarOptions) {
    if (!container) {
      throw new Error('[micro-charts] ProgressBar: container element is required');
    }

    this.options = { ...DEFAULT_OPTIONS, ...options } as RequiredProgressOptions;
    this.currentValue = this.options.value;

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);

    this.updateCache();
    this.render(this.currentValue);
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
    this._cancelRender = scheduleRender(() => this.render(this.currentValue));
  }

  private updateCache(): void {
    this._fontSize = this.options.height * 0.6;
  }

  setData(value: number): void {
    const { max } = this.options;
    const clampedValue = value < 0 ? 0 : value > max ? max : value;

    if (this.animationController) {
      this.animationController.cancel();
    }

    if (this.options.animate) {
      this.animationController = animate(
        this.currentValue,
        clampedValue,
        this.options.duration,
        (v) => {
          this.currentValue = v;
          this.render(v);
        },
        () => { this.currentValue = clampedValue; }
      );
    } else {
      this.currentValue = clampedValue;
      this.batchRender();
    }
  }

  setOptions(options: Partial<ProgressBarOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;

    this.options = { ...this.options, ...options } as RequiredProgressOptions;

    if (needsResize) {
      this.renderer.resize(this.options.width, this.options.height);
      this.resetStyleCache(); // Reset cache only on resize
      this.updateCache();
    }

    this.batchRender();
  }

  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.renderer.resize(width, height);
    this.resetStyleCache(); // Reset cache only on resize
    this.updateCache();
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

  /** Optimized render - style caching, direct ctx access, inline roundRect */
  private render(value: number): void {
    const { width, height, max, color, backgroundColor, showPercentage, borderRadius } = this.options;
    const ctx = this.renderer.ctx;

    this.renderer.clear();
    // Style cache is NOT reset here - only on resize

    const percentage = max > 0 ? value / max : 0;
    const progressWidth = width * percentage;
    const r = Math.min(borderRadius, height / 2, width / 2);

    // Background - inline roundRect for performance
    this.setFill(ctx, backgroundColor);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(width - r, 0);
    ctx.quadraticCurveTo(width, 0, width, r);
    ctx.lineTo(width, height - r);
    ctx.quadraticCurveTo(width, height, width - r, height);
    ctx.lineTo(r, height);
    ctx.quadraticCurveTo(0, height, 0, height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Progress
    if (progressWidth > 0) {
      const pr = Math.min(r, progressWidth / 2);
      this.setFill(ctx, color);
      ctx.beginPath();
      ctx.moveTo(pr, 0);
      ctx.lineTo(progressWidth - pr, 0);
      ctx.quadraticCurveTo(progressWidth, 0, progressWidth, pr);
      ctx.lineTo(progressWidth, height - pr);
      ctx.quadraticCurveTo(progressWidth, height, progressWidth - pr, height);
      ctx.lineTo(pr, height);
      ctx.quadraticCurveTo(0, height, 0, height - pr);
      ctx.lineTo(0, pr);
      ctx.quadraticCurveTo(0, 0, pr, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Percentage text
    if (showPercentage) {
      this.setFill(ctx, percentage > 0.5 ? '#fff' : COLOR_TEXT);
      ctx.font = `bold ${this._fontSize}px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(percentage * 100)}%`, width / 2, height / 2);
    }
  }
}
