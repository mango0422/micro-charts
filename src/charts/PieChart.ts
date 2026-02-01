/**
 * Pie/Donut Chart - Displays categorical data distribution
 *
 * Performance optimizations:
 * - Geometry values cached on resize
 * - Direct ctx access in render loop
 * - Style caching (only set when changed)
 * - Batch rendering via queueMicrotask
 * - Segment data reused, not recreated
 * - Click handler properly cleaned up
 */

import { CanvasRenderer } from '../core/canvas';
import { animate, scheduleRender } from '../core/animation';
import { generateColorPalette } from '../core/colors';
import { DEG_TO_RAD, TWO_PI, COLOR_TEXT, FONT_FAMILY } from '../core/constants';
import type { AnimationController } from '../types';

export interface PieChartData {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartOptions {
  size?: number;
  innerRadius?: number;
  startAngle?: number;
  animate?: boolean;
  duration?: number;
  showLabels?: boolean;
  onSegmentClick?: (index: number, data: PieChartData) => void;
}

interface SegmentData {
  startAngle: number;
  endAngle: number;
  color: string;
  data: PieChartData;
}

type RequiredPieOptions = Required<Omit<PieChartOptions, 'onSegmentClick'>> & {
  onSegmentClick?: (index: number, data: PieChartData) => void;
};

const DEFAULT_OPTIONS: RequiredPieOptions = {
  size: 200,
  innerRadius: 0,
  startAngle: -90,
  animate: true,
  duration: 600,
  showLabels: false,
};

export class PieChart {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private data: PieChartData[];
  private options: RequiredPieOptions;
  private segments: SegmentData[] = [];
  private animationController?: AnimationController;
  private clickHandler?: (e: MouseEvent) => void;

  // Cached geometry values
  private _cx = 0;
  private _cy = 0;
  private _outerRadius = 0;
  private _innerRadius = 0;
  private _startAngleRad = 0;
  private _labelFontSize = 0;

  // Style caching
  private _ctxFill: string | null = null;

  // Batch rendering
  private _cancelRender?: () => void;

  constructor(container: HTMLElement | null, data: PieChartData[], options?: PieChartOptions) {
    if (!container) {
      throw new Error('[micro-charts] PieChart: container element is required');
    }

    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.options.size, this.options.size);

    this.updateGeometry();
    this.calculateSegments();
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
  private batchRender(progress = 1): void {
    if (this._cancelRender) {
      this._cancelRender();
    }
    this._cancelRender = scheduleRender(() => this.render(progress));
  }

  /** Cache geometry calculations */
  private updateGeometry(): void {
    const { size, innerRadius, startAngle } = this.options;
    this._cx = size / 2;
    this._cy = size / 2;
    this._outerRadius = this._cx - 10;
    this._innerRadius = this._outerRadius * innerRadius;
    this._startAngleRad = startAngle * DEG_TO_RAD;
    this._labelFontSize = size * 0.05;
  }

  /** Calculate segment angles - called when data changes */
  private calculateSegments(): void {
    const total = this.data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
      this.segments.length = 0;
      return;
    }

    const colors = generateColorPalette(this.data.length);
    let currentAngle = this._startAngleRad;

    // Reuse segments array to avoid allocation
    this.segments.length = this.data.length;

    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i]!;
      const angle = (d.value / total) * TWO_PI;

      // Reuse or create segment object
      const seg = this.segments[i] ?? { startAngle: 0, endAngle: 0, color: '', data: d };
      seg.startAngle = currentAngle;
      seg.endAngle = currentAngle + angle;
      seg.color = d.color ?? colors[i] ?? '#888888';
      seg.data = d;
      this.segments[i] = seg;

      currentAngle += angle;
    }
  }

  private setupClickHandler(): void {
    if (!this.options.onSegmentClick) return;

    this.clickHandler = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Inline polar conversion for performance
      const dx = x - this._cx;
      const dy = y - this._cy;
      const radius = Math.sqrt(dx * dx + dy * dy);

      if (radius < this._innerRadius || radius > this._outerRadius) return;

      let angle = Math.atan2(dy, dx);
      if (angle < this._startAngleRad) {
        angle += TWO_PI;
      }

      const segments = this.segments;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]!;
        if (angle >= seg.startAngle && angle < seg.endAngle) {
          this.options.onSegmentClick!(i, seg.data);
          break;
        }
      }
    };

    this.canvas.addEventListener('click', this.clickHandler);
  }

  private animateIn(): void {
    this.animationController = animate(0, 1, this.options.duration, (progress) => {
      this.render(progress);
    });
  }

  setData(data: PieChartData[]): void {
    this.data = data;
    this.calculateSegments();

    if (this.animationController) {
      this.animationController.cancel();
    }

    if (this.options.animate) {
      this.animateIn();
    } else {
      this.batchRender();
    }
  }

  setOptions(options: Partial<PieChartOptions>): void {
    const needsResize = options.size !== undefined;
    const needsRecalc = options.startAngle !== undefined || options.innerRadius !== undefined;

    this.options = { ...this.options, ...options };

    if (needsResize) {
      this.renderer.resize(this.options.size, this.options.size);
      this.resetStyleCache(); // Reset cache only on resize
    }
    if (needsResize || needsRecalc) {
      this.updateGeometry();
    }

    this.calculateSegments();
    this.batchRender();
  }

  resize(size: number): void {
    this.options.size = size;
    this.renderer.resize(size, size);
    this.resetStyleCache(); // Reset cache only on resize
    this.updateGeometry();
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
    const ctx = this.renderer.ctx;
    const { showLabels } = this.options;

    this.renderer.clear();
    // Style cache is NOT reset here - only on resize

    const cx = this._cx;
    const cy = this._cy;
    const outerRadius = this._outerRadius;
    const inner = this._innerRadius;
    const segments = this.segments;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const endAngle = seg.startAngle + (seg.endAngle - seg.startAngle) * progress;

      this.setFill(ctx, seg.color);
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, seg.startAngle, endAngle, false);
      if (inner > 0) {
        ctx.arc(cx, cy, inner, endAngle, seg.startAngle, true);
      } else {
        ctx.lineTo(cx, cy);
      }
      ctx.closePath();
      ctx.fill();
    }

    if (showLabels && progress === 1) {
      const labelRadius = (outerRadius + inner) / 2;
      this.setFill(ctx, COLOR_TEXT);
      ctx.font = `${this._labelFontSize}px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]!;
        const midAngle = (seg.startAngle + seg.endAngle) / 2;
        ctx.fillText(seg.data.label, cx + Math.cos(midAngle) * labelRadius, cy + Math.sin(midAngle) * labelRadius);
      }
    }
  }
}
