/**
 * Multi-Line Time Series Chart entry point
 */

export { MultiLineChart } from './charts/MultiLineChart';
export type { MultiLineData, ColumnBasedData, SeriesConfig, MultiLineChartOptions } from './charts/MultiLineChart';
export type { DecimationOptions } from './core/decimation';
export { lttbDecimate, decimateMultiSeries } from './core/decimation';
