/**
 * MiniChart - Tiny inline trend visualization
 * For embedding in tables/dashboards (sparkline-style)
 */

import { CanvasRenderer } from '../core/canvas';

export interface MiniChartOptions {
  width?: number;
  height?: number;
  type?: 'line' | 'area' | 'bar';
  color?: string;
  showDots?: boolean;
  lineWidth?: number;
}

type RequiredOptions = Required<MiniChartOptions>;

const DEFAULT_OPTIONS: RequiredOptions = {
  width: 100,
  height: 30,
  type: 'line',
  color: '#3b82f6',
  showDots: false,
  lineWidth: 1.5,
};

export class MiniChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: number[];
  private options: RequiredOptions;

  constructor(container: HTMLElement | null, data: number[], options?: MiniChartOptions) {
    if (!container) throw new Error('[micro-charts] MiniChart: container is required');

    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);
    this.render();
  }

  private render(): void {
    const ctx = this.renderer.ctx;
    const { width, height, type, color, showDots, lineWidth } = this.options;
    const data = this.data;

    ctx.clearRect(0, 0, width, height);
    if (data.length === 0) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const chartH = height - padding * 2;
    const chartW = width - padding * 2;

    const getX = (i: number) => padding + (i / (data.length - 1 || 1)) * chartW;
    const getY = (v: number) => padding + chartH - ((v - min) / range) * chartH;

    if (type === 'bar') {
      const barW = chartW / data.length - 1;
      ctx.fillStyle = color;
      for (let i = 0; i < data.length; i++) {
        const x = padding + i * (barW + 1);
        const barH = ((data[i]! - min) / range) * chartH;
        ctx.fillRect(x, height - padding - barH, barW, barH);
      }
      return;
    }

    // Line/Area
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]!));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(getX(i), getY(data[i]!));
    }

    if (type === 'area') {
      ctx.lineTo(getX(data.length - 1), height - padding);
      ctx.lineTo(getX(0), height - padding);
      ctx.closePath();
      ctx.fillStyle = color + '40';
      ctx.fill();

      // Redraw line on top
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(data[0]!));
      for (let i = 1; i < data.length; i++) {
        ctx.lineTo(getX(i), getY(data[i]!));
      }
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots at peaks
    if (showDots) {
      const maxIdx = data.indexOf(max);
      const minIdx = data.indexOf(min);
      ctx.fillStyle = color;

      if (maxIdx >= 0) {
        ctx.beginPath();
        ctx.arc(getX(maxIdx), getY(max), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (minIdx >= 0 && minIdx !== maxIdx) {
        ctx.beginPath();
        ctx.arc(getX(minIdx), getY(min), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  setData(data: number[]): void {
    this.data = data;
    this.render();
  }

  setOptions(options: Partial<MiniChartOptions>): void {
    const needsResize = options.width !== undefined || options.height !== undefined;
    Object.assign(this.options, options);
    if (needsResize) {
      this.renderer = new CanvasRenderer(this.canvas, this.options.width, this.options.height);
    }
    this.render();
  }

  destroy(): void {
    this.canvas.remove();
  }
}
