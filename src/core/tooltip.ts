/**
 * Canvas-based Tooltip Renderer
 *
 * Renders tooltips directly on canvas instead of using DOM elements.
 * This reduces DOM operations and provides better performance for
 * frequently updating tooltips.
 *
 * Enable globally via: configureDefaults({ canvasTooltips: true })
 */

import { FONT_FAMILY, FONT_SIZE_SM } from './constants';

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface TooltipLine {
  text: string;
  color?: string | undefined;
  bold?: boolean | undefined;
}

export interface CanvasTooltipOptions {
  padding?: number;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontSize?: number;
  lineHeight?: number;
  maxWidth?: number;
  colorDotSize?: number;
}

const DEFAULT_OPTIONS: Required<CanvasTooltipOptions> = {
  padding: 8,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  textColor: '#ffffff',
  borderRadius: 4,
  fontSize: FONT_SIZE_SM,
  lineHeight: 1.4,
  maxWidth: 300,
  colorDotSize: 6,
};

/**
 * CanvasTooltip - Renders tooltips directly on canvas
 *
 * Usage:
 * ```typescript
 * const tooltip = new CanvasTooltip(ctx);
 *
 * // Show simple text
 * tooltip.show({ x: 100, y: 100 }, 'Hello World');
 *
 * // Show multiple lines with colors
 * tooltip.show({ x: 100, y: 100 }, [
 *   { text: 'Title', bold: true },
 *   { text: 'Value: 42', color: '#3b82f6' },
 * ]);
 *
 * // Hide
 * tooltip.hide();
 * ```
 */
export class CanvasTooltip {
  private ctx: CanvasRenderingContext2D;
  private options: Required<CanvasTooltipOptions>;
  private visible = false;
  private position: TooltipPosition = { x: 0, y: 0 };
  private lines: TooltipLine[] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;

  constructor(ctx: CanvasRenderingContext2D, options?: CanvasTooltipOptions) {
    this.ctx = ctx;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.canvasWidth = ctx.canvas.width;
    this.canvasHeight = ctx.canvas.height;
  }

  /**
   * Update canvas dimensions (call after resize)
   */
  updateDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Show tooltip at position
   */
  show(position: TooltipPosition, content: string | TooltipLine[]): void {
    this.visible = true;
    this.position = position;

    if (typeof content === 'string') {
      this.lines = [{ text: content }];
    } else {
      this.lines = content;
    }
  }

  /**
   * Hide tooltip
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Check if tooltip is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Render tooltip on canvas
   * Call this at the end of your render loop
   */
  render(): void {
    if (!this.visible || this.lines.length === 0) return;

    const ctx = this.ctx;
    const { padding, backgroundColor, textColor, borderRadius, fontSize, lineHeight, maxWidth, colorDotSize } = this.options;

    // Save context state
    ctx.save();

    // Set font for measurements
    ctx.font = `${fontSize}px ${FONT_FAMILY}`;

    // Calculate tooltip dimensions
    let tooltipWidth = 0;
    const lineHeightPx = fontSize * lineHeight;

    for (const line of this.lines) {
      const textWidth = ctx.measureText(line.text).width;
      const lineWidth = (line.color ? colorDotSize + 6 : 0) + textWidth;
      if (lineWidth > tooltipWidth) {
        tooltipWidth = lineWidth;
      }
    }

    tooltipWidth = Math.min(tooltipWidth + padding * 2, maxWidth);
    const tooltipHeight = this.lines.length * lineHeightPx + padding * 2;

    // Calculate position (avoid going off canvas)
    let x = this.position.x + 10;
    let y = this.position.y + 10;

    // Adjust if tooltip would go off right edge
    if (x + tooltipWidth > this.canvasWidth - 5) {
      x = this.position.x - tooltipWidth - 10;
    }

    // Adjust if tooltip would go off bottom edge
    if (y + tooltipHeight > this.canvasHeight - 5) {
      y = this.position.y - tooltipHeight - 10;
    }

    // Ensure tooltip stays within bounds
    x = Math.max(5, x);
    y = Math.max(5, y);

    // Draw background with rounded corners
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();

    // Rounded rectangle path
    ctx.moveTo(x + borderRadius, y);
    ctx.lineTo(x + tooltipWidth - borderRadius, y);
    ctx.arcTo(x + tooltipWidth, y, x + tooltipWidth, y + borderRadius, borderRadius);
    ctx.lineTo(x + tooltipWidth, y + tooltipHeight - borderRadius);
    ctx.arcTo(x + tooltipWidth, y + tooltipHeight, x + tooltipWidth - borderRadius, y + tooltipHeight, borderRadius);
    ctx.lineTo(x + borderRadius, y + tooltipHeight);
    ctx.arcTo(x, y + tooltipHeight, x, y + tooltipHeight - borderRadius, borderRadius);
    ctx.lineTo(x, y + borderRadius);
    ctx.arcTo(x, y, x + borderRadius, y, borderRadius);
    ctx.closePath();
    ctx.fill();

    // Draw text lines
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i]!;
      const lineY = y + padding + i * lineHeightPx;
      let lineX = x + padding;

      // Draw color dot if specified
      if (line.color) {
        ctx.fillStyle = line.color;
        ctx.beginPath();
        ctx.arc(lineX + colorDotSize / 2, lineY + fontSize / 2, colorDotSize / 2, 0, Math.PI * 2);
        ctx.fill();
        lineX += colorDotSize + 6;
      }

      // Draw text
      ctx.fillStyle = textColor;
      ctx.font = line.bold ? `bold ${fontSize}px ${FONT_FAMILY}` : `${fontSize}px ${FONT_FAMILY}`;
      ctx.fillText(line.text, lineX, lineY);
    }

    // Restore context state
    ctx.restore();
  }
}

/**
 * Helper to create tooltip content from a simple label/value format
 */
export function createTooltipContent(
  title: string,
  entries: Array<{ name: string; value: string | number; color?: string }>
): TooltipLine[] {
  const lines: TooltipLine[] = [{ text: title, bold: true }];

  for (const entry of entries) {
    const valueStr = typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value;
    lines.push({
      text: `${entry.name}: ${valueStr}`,
      color: entry.color,
    });
  }

  return lines;
}
