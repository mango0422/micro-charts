/**
 * Radial Progress - Circular progress indicator
 * Simplified version of GaugeChart - full circle progress ring
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { COLOR_TEXT, FONT_FAMILY } from '../core/constants';
import type { AnimationController } from '../types';

export interface RadialProgressOptions {
  value?: number;
  max?: number;
  size?: number;
  thickness?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  clockwise?: boolean;
  animate?: boolean;
  duration?: number;
}

type RequiredOptions = Required<RadialProgressOptions>;

const DEFAULT_OPTIONS: RequiredOptions = {
  value: 0,
  max: 100,
  size: 120,
  thickness: 10,
  color: '#3b82f6',
  backgroundColor: '#e5e7eb',
  showPercentage: true,
  clockwise: true,
  animate: false,
  duration: 500,
};

export class RadialProgress {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private options: RequiredOptions;
  private animationController?: AnimationController;
  private _cancelRender?: () => void;
  private _displayValue = 0;

  constructor(container: HTMLElement | null, options?: RadialProgressOptions) {
    if (!container) throw new Error('[micro-charts] RadialProgress: container is required');

    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.size, this.options.size);

    if (this.options.animate) {
      this.animateIn();
    } else {
      this._displayValue = this.options.value;
      this.render();
    }
  }

  private render(): void {
    const ctx = this.renderer.ctx;
    const { size, thickness, color, backgroundColor, showPercentage, clockwise, max } = this.options;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - thickness) / 2;

    ctx.clearRect(0, 0, size, size);

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = backgroundColor;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Progress arc
    const progress = Math.min(this._displayValue / max, 1);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (clockwise ? 1 : -1) * progress * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, !clockwise);
    ctx.strokeStyle = color;
    ctx.stroke();

    // Percentage text
    if (showPercentage) {
      const percent = Math.round((this._displayValue / max) * 100);
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = `bold ${size / 4}px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percent}%`, centerX, centerY);
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

  setData(value: number): void {
    this.options.value = value;
    if (this.animationController) this.animationController.cancel();
    if (this.options.animate) {
      this.animateIn();
    } else {
      this._displayValue = value;
      if (this._cancelRender) this._cancelRender();
      this._cancelRender = scheduleRender(() => this.render());
    }
  }

  setOptions(options: Partial<RadialProgressOptions>): void {
    Object.assign(this.options, options);
    if (options.size) this.renderer = new CanvasRenderer(this.canvas, options.size, options.size);
    this._displayValue = this.options.value;
    this.render();
  }

  destroy(): void {
    if (this.animationController) this.animationController.cancel();
    this.canvas.remove();
  }
}
