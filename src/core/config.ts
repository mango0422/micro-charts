/**
 * Global configuration for micro-charts
 *
 * Use configureDefaults() to set library-wide defaults.
 * Individual chart options will override these defaults.
 */

export interface GlobalConfig {
  /**
   * Disable all animations library-wide
   * When true, all charts will render instantly without animation
   * regardless of their individual `animate` option
   */
  disableAnimation: boolean;

  /**
   * Default animation duration in milliseconds
   */
  defaultDuration: number;

  /**
   * Use canvas-based tooltips instead of DOM
   * Reduces DOM operations but with simpler styling
   */
  canvasTooltips: boolean;
}

const defaultConfig: GlobalConfig = {
  disableAnimation: false,
  defaultDuration: 500,
  canvasTooltips: false,
};

let globalConfig: GlobalConfig = { ...defaultConfig };

/**
 * Configure library-wide defaults
 *
 * @example
 * ```typescript
 * import { configureDefaults } from '@mango0422/micro-charts';
 *
 * // Disable all animations for better performance
 * configureDefaults({ disableAnimation: true });
 *
 * // Use canvas tooltips
 * configureDefaults({ canvasTooltips: true });
 * ```
 */
export function configureDefaults(config: Partial<GlobalConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current global configuration
 */
export function getConfig(): Readonly<GlobalConfig> {
  return globalConfig;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  globalConfig = { ...defaultConfig };
}

/**
 * Check if animations are globally disabled
 */
export function isAnimationDisabled(): boolean {
  return globalConfig.disableAnimation;
}

/**
 * Get default animation duration
 */
export function getDefaultDuration(): number {
  return globalConfig.defaultDuration;
}

/**
 * Check if canvas tooltips are enabled
 */
export function useCanvasTooltips(): boolean {
  return globalConfig.canvasTooltips;
}
