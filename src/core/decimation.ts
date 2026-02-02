/**
 * LTTB (Largest Triangle Three Buckets) Decimation Algorithm
 *
 * Reduces data points while preserving visual shape.
 * Reference: https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf
 */

export interface DecimationOptions {
  /** Enable/disable decimation */
  enabled?: boolean;
  /** Maximum number of points to keep (default: 500) */
  threshold?: number;
}

/**
 * LTTB decimation algorithm for time-series data
 * Preserves peaks and valleys in the data while reducing point count
 *
 * @param data Array of [x, y] tuples
 * @param threshold Maximum number of output points
 * @returns Decimated array of [x, y] tuples
 */
export function lttbDecimate(
  data: [number, number][],
  threshold: number
): [number, number][] {
  const dataLength = data.length;

  // No decimation needed
  if (threshold >= dataLength || threshold <= 2) {
    return data;
  }

  const sampled: [number, number][] = [];

  // Always keep first point
  sampled.push(data[0]!);

  // Bucket size (except first and last points)
  const bucketSize = (dataLength - 2) / (threshold - 2);

  let prevIndex = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate average point in next bucket (for triangle calculation)
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, dataLength);
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    let avgX = 0;
    let avgY = 0;

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j]![0];
      avgY += data[j]![1];
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for current bucket
    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = avgRangeStart;

    // Point in previous bucket
    const prevPoint = data[prevIndex]!;

    // Find point with maximum triangle area
    let maxArea = -1;
    let maxAreaIndex = rangeStart;

    for (let j = rangeStart; j < rangeEnd; j++) {
      const currentPoint = data[j]!;

      // Calculate triangle area using cross product
      const area = Math.abs(
        (prevPoint[0] - avgX) * (currentPoint[1] - prevPoint[1]) -
        (prevPoint[0] - currentPoint[0]) * (avgY - prevPoint[1])
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled.push(data[maxAreaIndex]!);
    prevIndex = maxAreaIndex;
  }

  // Always keep last point
  sampled.push(data[dataLength - 1]!);

  return sampled;
}

/**
 * Apply LTTB decimation to multiple series
 * Each series is decimated independently to preserve its shape
 *
 * @param timestamps Array of timestamps
 * @param series Object mapping series keys to value arrays
 * @param threshold Maximum points per series
 * @returns Decimated data with aligned timestamps
 */
export function decimateMultiSeries(
  timestamps: number[],
  series: Record<string, (number | null)[]>,
  threshold: number
): { timestamps: number[]; series: Record<string, (number | null)[]> } {
  const dataLength = timestamps.length;

  // No decimation needed
  if (threshold >= dataLength || threshold <= 2) {
    return { timestamps, series };
  }

  // For multi-series, we need to find important points across all series
  // Use the union of important indices from each series

  const importantIndices = new Set<number>();

  // Always include first and last
  importantIndices.add(0);
  importantIndices.add(dataLength - 1);

  const keys = Object.keys(series);

  // For each series, find its important points
  for (const key of keys) {
    const values = series[key]!;

    // Build [timestamp, value] pairs for non-null values
    const pairs: [number, number, number][] = []; // [timestamp, value, originalIndex]

    for (let i = 0; i < dataLength; i++) {
      const val = values[i];
      const ts = timestamps[i];
      if (val !== null && val !== undefined && ts !== undefined) {
        pairs.push([ts, val as number, i]);
      }
    }

    if (pairs.length <= 2) continue;

    // Calculate per-series threshold proportionally
    const seriesThreshold = Math.max(2, Math.floor(threshold * pairs.length / dataLength));

    // Apply LTTB to this series
    const decimatedPairs = lttbDecimate(
      pairs.map(p => [p[0], p[1]] as [number, number]),
      seriesThreshold
    );

    // Map back to original indices
    for (const [ts] of decimatedPairs) {
      const originalPair = pairs.find(p => p[0] === ts);
      if (originalPair) {
        importantIndices.add(originalPair[2]);
      }
    }
  }

  // Sort indices and build output
  const sortedIndices = Array.from(importantIndices).sort((a, b) => a - b);

  const newTimestamps: number[] = [];
  const newSeries: Record<string, (number | null)[]> = {};

  for (const key of keys) {
    newSeries[key] = [];
  }

  for (const idx of sortedIndices) {
    newTimestamps.push(timestamps[idx]!);
    for (const key of keys) {
      newSeries[key]!.push(series[key]![idx] ?? null);
    }
  }

  return { timestamps: newTimestamps, series: newSeries };
}
