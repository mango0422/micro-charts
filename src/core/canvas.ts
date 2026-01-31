/**
 * Canvas rendering utilities with HiDPI support
 *
 * Performance note: For maximum performance, access ctx directly
 * instead of using wrapper methods.
 */

import { getDevicePixelRatio } from '../types';

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
  width: number;
  height: number;
}

/**
 * Canvas renderer with HiDPI/retina display support
 *
 * Usage:
 *   const renderer = new CanvasRenderer(canvas, 400, 300);
 *   const ctx = renderer.ctx;  // Direct access for performance
 *   ctx.fillStyle = 'red';
 *   ctx.fillRect(0, 0, 100, 100);
 */
export class CanvasRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly dpr: number;
  private _width: number;
  private _height: number;

  constructor(canvas: HTMLCanvasElement, width?: number, height?: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[micro-charts] Failed to get 2d context from canvas');
    }
    this.ctx = ctx;
    this.dpr = getDevicePixelRatio();
    this._width = width ?? (canvas.clientWidth || 300);
    this._height = height ?? (canvas.clientHeight || 150);
    this.resize(this._width, this._height);
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }

  /** Resize canvas with HiDPI scaling */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  /** Clear entire canvas */
  clear(): void {
    this.ctx.clearRect(0, 0, this._width, this._height);
  }
}
