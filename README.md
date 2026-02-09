# Micro Charts

> Lightweight alternative to recharts with uPlot-inspired optimizations.
> Zero dependencies. Canvas-based. 11 chart types.

[![npm version](https://img.shields.io/npm/v/@mango0422/micro-charts.svg)](https://www.npmjs.com/package/@mango0422/micro-charts)
![bundle-phobia](https://badgen.net/bundlephobia/min/@mango0422/micro-charts)

## Features

- **Lightweight**: ~60KB (IIFE), ~18KB gzipped - **10x smaller than recharts**
- **Zero dependencies**: Completely standalone, no external libraries
- **Fast**: Canvas-based rendering with uPlot-inspired optimizations
  - Style caching (minimal Canvas API calls)
  - Global RAF scheduler (efficient batched rendering)
  - Zero-allocation loops (reduced GC pressure)
- **Tree-shakeable**: Import only what you need, individual charts 1-3KB
- **11 Chart Types**: Gauge, Pie, Bar, Progress, StackedBar, HeatMap, Radar, Funnel, HorizontalBar, VerticalBar, MultiLine
- **Framework-agnostic**: Works with React, Vue, Svelte, or Vanilla JS
- **TypeScript**: Full type definitions included

## When to Use

Choose the right tool for your use case:

| Feature              | **Micro Charts** | uPlot | recharts |
| -------------------- | ---------------- | ----- | -------- |
| **Bundle Size**      | ~60KB            | ~50KB | ~500KB   |
| **Dependencies**     | 0                | 0     | 10+      |
| **Chart Types**      | 11               | 1     | 20+      |
| **Time-series**      | ✅               | ✅✅✅ | ✅       |
| **Dashboards/KPIs**  | ✅✅✅            | ❌    | ✅✅     |
| **Large Datasets**   | Good (10K pts)   | Excellent (1M+ pts) | Fair (1K pts) |
| **Animations**       | ✅               | ❌    | ✅       |
| **React Native**     | Manual           | Manual | Native   |
| **Learning Curve**   | Easy             | Medium | Easy     |

### Use Micro Charts when:
- ✅ Building **dashboards** with diverse chart types (Gauge, Pie, Radar, etc.)
- ✅ Replacing **recharts** to reduce bundle size by 90%
- ✅ Need **zero dependencies** and full control
- ✅ Working with **moderate datasets** (up to 10K points)

### Use uPlot when:
- ✅ Building **high-performance time-series** visualizations
- ✅ Handling **massive datasets** (100K - 1M+ datapoints)
- ✅ Need **extreme optimization** (60fps streaming at 10% CPU)

### Use recharts when:
- ✅ Deep **React ecosystem** integration required
- ✅ Need **extensive customization** and components
- ✅ Bundle size is not a concern

## Installation

```bash
npm install @mango0422/micro-charts
# or
pnpm add @mango0422/micro-charts
# or
yarn add @mango0422/micro-charts
```

### CDN (IIFE)

```html
<!-- jsdelivr (recommended - faster) -->
<script src="https://cdn.jsdelivr.net/npm/@mango0422/micro-charts/dist/index.global.js"></script>

<!-- unpkg (alternative) -->
<!-- <script src="https://unpkg.com/@mango0422/micro-charts/dist/index.global.js"></script> -->

<script>
  const { GaugeChart } = MicroCharts;
</script>
```

## Quick Start

### GaugeChart

```typescript
import { GaugeChart } from "@mango0422/micro-charts";

const gauge = new GaugeChart(document.getElementById("gauge"), {
  value: 75,
  max: 100,
  thresholds: { warning: 60, critical: 80 },
});

// Update value
gauge.setData(90);

// Cleanup
gauge.destroy();
```

### PieChart

```typescript
import { PieChart } from "@mango0422/micro-charts";

const pie = new PieChart(
  document.getElementById("pie"),
  [
    { label: "Normal", value: 120 },
    { label: "Warning", value: 30 },
    { label: "Error", value: 10 },
  ],
  { innerRadius: 0.5 } // Donut mode
);
```

### BarChart

```typescript
import { BarChart } from "@mango0422/micro-charts";

const bar = new BarChart(
  document.getElementById("bar"),
  [
    { label: "Server 1", value: 85 },
    { label: "Server 2", value: 60 },
    { label: "Server 3", value: 95 },
  ],
  { orientation: "horizontal" }
);
```

### ProgressBar

```typescript
import { ProgressBar } from "@mango0422/micro-charts";

const progress = new ProgressBar(document.getElementById("progress"), {
  value: 75,
  max: 100,
});
```

### StackedBarChart

```typescript
import { StackedBarChart } from "@mango0422/micro-charts";

const stackedBar = new StackedBarChart(
  document.getElementById("stacked"),
  {
    categories: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    series: [
      { label: "Inbound", data: [120, 150, 180, 140, 200] },
      { label: "Outbound", data: [80, 90, 100, 95, 110] },
      { label: "Error", data: [5, 8, 3, 10, 6] },
    ],
  },
  { showTotal: true, showLegend: true }
);
```

### HeatMap

```typescript
import { HeatMap } from "@mango0422/micro-charts";

const heatmap = new HeatMap(
  document.getElementById("heatmap"),
  {
    rows: ["00:00", "01:00", "02:00", "03:00"],
    columns: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    values: [
      [120, 150, 180, 140, 200],
      [80, 90, 100, 95, 110],
      [60, 70, 65, 80, 75],
      [40, 50, 55, 60, 65],
    ],
  },
  { colorScheme: "sequential", showValues: true }
);
```

### RadarChart

```typescript
import { RadarChart } from "@mango0422/micro-charts";

const radar = new RadarChart(
  document.getElementById("radar"),
  {
    axes: [
      { label: "CPU", max: 100 },
      { label: "Memory", max: 100 },
      { label: "Disk", max: 100 },
      { label: "Network", max: 100 },
    ],
    datasets: [
      { label: "Server A", data: [80, 70, 90, 60], color: "#3b82f6" },
      { label: "Server B", data: [60, 85, 75, 80], color: "#ef4444" },
    ],
  },
  { showGrid: true, showLegend: true }
);
```

### FunnelChart

```typescript
import { FunnelChart } from "@mango0422/micro-charts";

const funnel = new FunnelChart(
  document.getElementById("funnel"),
  [
    { label: "Packets Received", value: 10000 },
    { label: "Valid Packets", value: 9500 },
    { label: "Processed", value: 9200 },
    { label: "Forwarded", value: 8800 },
    { label: "Delivered", value: 8500 },
  ],
  { showPercentage: true, orientation: "vertical" }
);
```

### HorizontalBarChart

```typescript
import { HorizontalBarChart } from "@mango0422/micro-charts";

const hbar = new HorizontalBarChart(
  document.getElementById("hbar"),
  [
    { label: "Core 0", value: 45 },
    { label: "Core 1", value: 78 },
    { label: "Core 2", value: 92 },
  ],
  {
    domain: [0, 100],
    showGrid: true,
    tooltip: {
      formatter: (value) => `${value}% Usage`,
    },
  }
);
```

### VerticalBarChart

```typescript
import { VerticalBarChart } from "@mango0422/micro-charts";

const vbar = new VerticalBarChart(
  document.getElementById("vbar"),
  [
    { label: "0-10%", value: 12 },
    { label: "10-30%", value: 8 },
    { label: "30-50%", value: 4 },
    { label: "50-70%", value: 2 },
  ],
  {
    allowDecimals: false,
    showGrid: true,
  }
);
```

### MultiLineChart

```typescript
import { MultiLineChart } from "@mango0422/micro-charts";

const line = new MultiLineChart(
  document.getElementById("line"),
  [
    { timestamp: 1706800000000, eth0: 1500000, eth1: 2300000 },
    { timestamp: 1706800060000, eth0: 1620000, eth1: 2100000 },
    { timestamp: 1706800120000, eth0: 1480000, eth1: 2500000 },
  ],
  {
    series: [
      { key: "eth0", name: "Interface 0", color: "#3b82f6" },
      { key: "eth1", name: "Interface 1", color: "#22c55e" },
    ],
    yAxis: {
      tickFormatter: (v) => `${(v / 1000000).toFixed(1)} Mbps`,
    },
    tooltip: {
      filter: (value) => value !== null && value > 0,
      sort: (a, b) => b.value - a.value,
    },
  }
);
```

## API Reference

### GaugeChart

```typescript
new GaugeChart(container: HTMLElement, options: GaugeChartOptions)
```

**Options:**

| Option       | Type    | Default   | Description                     |
| ------------ | ------- | --------- | ------------------------------- |
| `value`      | number  | required  | Current value                   |
| `min`        | number  | 0         | Minimum value                   |
| `max`        | number  | 100       | Maximum value                   |
| `size`       | number  | 200       | Canvas size (px)                |
| `thickness`  | number  | 0.2       | Arc thickness ratio (0-1)       |
| `thresholds` | object  | -         | `{ warning: number, critical: number }` |
| `colors`     | object  | -         | Custom colors for states        |
| `showValue`  | boolean | true      | Show value text                 |
| `animate`    | boolean | true      | Enable animation                |
| `duration`   | number  | 500       | Animation duration (ms)         |

**Methods:**

- `setData(value: number)` - Update value with animation
- `setOptions(options: Partial<GaugeChartOptions>)` - Update options
- `resize(size: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### PieChart

```typescript
new PieChart(container: HTMLElement, data: PieChartData[], options?: PieChartOptions)
```

**Data:**

```typescript
interface PieChartData {
  label: string;
  value: number;
  color?: string; // Auto-generated if not provided
}
```

**Options:**

| Option           | Type     | Default | Description                    |
| ---------------- | -------- | ------- | ------------------------------ |
| `size`           | number   | 200     | Canvas size (px)               |
| `innerRadius`    | number   | 0       | Inner radius ratio (0-1), 0 = pie, >0 = donut |
| `startAngle`     | number   | -90     | Start angle (degrees)          |
| `animate`        | boolean  | true    | Enable animation               |
| `duration`       | number   | 600     | Animation duration (ms)        |
| `showLabels`     | boolean  | false   | Show segment labels            |
| `onSegmentClick` | function | -       | Click handler `(index, data) => void` |

**Methods:**

- `setData(data: PieChartData[])` - Update data with animation
- `setOptions(options: Partial<PieChartOptions>)` - Update options
- `resize(size: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### BarChart

```typescript
new BarChart(container: HTMLElement, data: BarChartData[], options?: BarChartOptions)
```

**Data:**

```typescript
interface BarChartData {
  label: string;
  value: number;
  color?: string;
}
```

**Options:**

| Option         | Type     | Default    | Description                    |
| -------------- | -------- | ---------- | ------------------------------ |
| `width`        | number   | 400        | Canvas width (px)              |
| `height`       | number   | 300        | Canvas height (px)             |
| `orientation`  | string   | 'vertical' | 'vertical' or 'horizontal'     |
| `max`          | number   | auto       | Maximum value (auto-calculated)|
| `barThickness` | number   | 0.6        | Bar thickness ratio (0-1)      |
| `showValues`   | boolean  | false      | Show value labels              |
| `showGrid`     | boolean  | true       | Show background grid           |
| `animate`      | boolean  | true       | Enable animation               |
| `duration`     | number   | 500        | Animation duration (ms)        |

**Methods:**

- `setData(data: BarChartData[])` - Update data with animation
- `setOptions(options: Partial<BarChartOptions>)` - Update options
- `resize(width: number, height: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### ProgressBar

```typescript
new ProgressBar(container: HTMLElement, options: ProgressBarOptions)
```

**Options:**

| Option            | Type    | Default   | Description              |
| ----------------- | ------- | --------- | ------------------------ |
| `value`           | number  | required  | Current value            |
| `max`             | number  | 100       | Maximum value            |
| `width`           | number  | 300       | Width (px)               |
| `height`          | number  | 20        | Height (px)              |
| `color`           | string  | '#3b82f6' | Fill color               |
| `backgroundColor` | string  | '#e5e7eb' | Background color         |
| `showPercentage`  | boolean | true      | Show percentage text     |
| `animate`         | boolean | true      | Enable animation         |
| `duration`        | number  | 400       | Animation duration (ms)  |
| `borderRadius`    | number  | 4         | Border radius (px)       |

**Methods:**

- `setData(value: number)` - Update value with animation
- `setOptions(options: Partial<ProgressBarOptions>)` - Update options
- `resize(width: number, height: number)` - Resize the bar
- `destroy()` - Cleanup and remove

### StackedBarChart

```typescript
new StackedBarChart(container: HTMLElement, data: StackedBarData, options?: StackedBarOptions)
```

**Data:**

```typescript
interface StackedBarData {
  categories: string[]; // X-axis labels
  series: Array<{
    label: string; // Series name
    data: number[]; // Values for each category
    color?: string; // Auto-generated if not provided
  }>;
}
```

**Options:**

| Option         | Type     | Default    | Description                        |
| -------------- | -------- | ---------- | ---------------------------------- |
| `width`        | number   | 500        | Canvas width (px)                  |
| `height`       | number   | 300        | Canvas height (px)                 |
| `orientation`  | string   | 'vertical' | 'vertical' or 'horizontal'         |
| `barThickness` | number   | 0.7        | Bar thickness ratio (0-1)          |
| `showValues`   | boolean  | false      | Show value labels on segments      |
| `showTotal`    | boolean  | true       | Show total on top of stack         |
| `showLegend`   | boolean  | true       | Show series legend                 |
| `showGrid`     | boolean  | true       | Show background grid               |
| `animate`      | boolean  | true       | Enable animation                   |
| `duration`     | number   | 600        | Animation duration (ms)            |
| `stacked100`   | boolean  | false      | Normalize to 100%                  |

**Methods:**

- `setData(data: StackedBarData)` - Update data with animation
- `setOptions(options: Partial<StackedBarOptions>)` - Update options
- `resize(width: number, height: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### HeatMap

```typescript
new HeatMap(container: HTMLElement, data: HeatMapData, options?: HeatMapOptions)
```

**Data:**

```typescript
interface HeatMapData {
  rows: string[]; // Y-axis labels
  columns: string[]; // X-axis labels
  values: number[][]; // 2D array [row][col]
}
```

**Options:**

| Option           | Type     | Default      | Description                            |
| ---------------- | -------- | ------------ | -------------------------------------- |
| `width`          | number   | 600          | Canvas width (px)                      |
| `height`         | number   | 400          | Canvas height (px)                     |
| `cellPadding`    | number   | 2            | Padding between cells                  |
| `showValues`     | boolean  | false        | Show numeric values in cells           |
| `colorScheme`    | string   | 'sequential' | 'sequential' or 'diverging'            |
| `colors`         | object   | -            | `{ min, mid, max }` color configuration|
| `min`            | number   | auto         | Manual min value                       |
| `max`            | number   | auto         | Manual max value                       |
| `showAxisLabels` | boolean  | true         | Show row/column labels                 |
| `animate`        | boolean  | true         | Enable animation                       |
| `duration`       | number   | 400          | Animation duration (ms)                |
| `onCellClick`    | function | -            | Click handler `(row, col, value) => void`|

**Methods:**

- `setData(data: HeatMapData)` - Update data with animation
- `setOptions(options: Partial<HeatMapOptions>)` - Update options
- `resize(width: number, height: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### RadarChart

```typescript
new RadarChart(container: HTMLElement, data: RadarChartData, options?: RadarChartOptions)
```

**Data:**

```typescript
interface RadarChartData {
  axes: Array<{
    label: string; // Axis name
    max?: number; // Max value for this axis
  }>;
  datasets: Array<{
    label: string; // Dataset name
    data: number[]; // Values for each axis
    color?: string; // Auto-generated if not provided
    fill?: boolean; // Fill polygon, default: true
    fillOpacity?: number; // Fill opacity 0-1, default: 0.2
  }>;
}
```

**Options:**

| Option       | Type    | Default | Description                  |
| ------------ | ------- | ------- | ---------------------------- |
| `size`       | number  | 400     | Canvas size (px, square)     |
| `levels`     | number  | 5       | Number of concentric levels  |
| `showGrid`   | boolean | true    | Show grid lines              |
| `showLabels` | boolean | true    | Show axis labels             |
| `showValues` | boolean | false   | Show data point values       |
| `showLegend` | boolean | true    | Show dataset legend          |
| `animate`    | boolean | true    | Enable animation             |
| `duration`   | number  | 600     | Animation duration (ms)      |

**Methods:**

- `setData(data: RadarChartData)` - Update data with animation
- `setOptions(options: Partial<RadarChartOptions>)` - Update options
- `resize(size: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### FunnelChart

```typescript
new FunnelChart(container: HTMLElement, data: FunnelChartData, options?: FunnelChartOptions)
```

**Data:**

```typescript
type FunnelChartData = Array<{
  label: string; // Stage name
  value: number; // Count at this stage
  color?: string; // Auto-generated if not provided
}>;
```

**Options:**

| Option           | Type     | Default    | Description                        |
| ---------------- | -------- | ---------- | ---------------------------------- |
| `width`          | number   | 500        | Canvas width (px)                  |
| `height`         | number   | 400        | Canvas height (px)                 |
| `orientation`    | string   | 'vertical' | 'vertical' or 'horizontal'         |
| `neckRatio`      | number   | 0.3        | Width ratio at bottom              |
| `gap`            | number   | 4          | Gap between stages                 |
| `showLabels`     | boolean  | true       | Show stage labels                  |
| `showValues`     | boolean  | true       | Show values                        |
| `showPercentage` | boolean  | true       | Show % of previous stage           |
| `animate`        | boolean  | true       | Enable animation                   |
| `duration`       | number   | 600        | Animation duration (ms)            |
| `onStageClick`   | function | -          | Click handler `(index, stage) => void`|

**Methods:**

- `setData(data: FunnelChartData)` - Update data with animation
- `setOptions(options: Partial<FunnelChartOptions>)` - Update options
- `resize(width: number, height: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### HorizontalBarChart

```typescript
new HorizontalBarChart(container: HTMLElement, data: HorizontalBarData[], options?: HorizontalBarChartOptions)
```

**Data:**

```typescript
interface HorizontalBarData {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}
```

**Options:**

| Option           | Type     | Default   | Description                            |
| ---------------- | -------- | --------- | -------------------------------------- |
| `width`          | number   | 400       | Canvas width (px)                      |
| `height`         | number   | auto      | Auto-calculated based on bar count     |
| `barHeight`      | number   | 16        | Height of each bar                     |
| `barSpacing`     | number   | 6         | Spacing between bars                   |
| `barRadius`      | number   | 4         | Right corner radius                    |
| `domain`         | [number, number] | [0, 100] | Value range                    |
| `showGrid`       | boolean  | true      | Show vertical grid lines               |
| `gridDash`       | number[] | [3, 3]    | Grid line dash pattern                 |
| `labelWidth`     | number   | 80        | Width reserved for labels              |
| `showValues`     | boolean  | true      | Show value labels                      |
| `valueFormatter` | function | -         | Format value display                   |
| `tooltip`        | object/false | false  | Tooltip configuration                  |
| `animate`        | boolean  | true      | Enable animation                       |
| `duration`       | number   | 500       | Animation duration (ms)                |

**Methods:**

- `setData(data: HorizontalBarData[])` - Update data with animation
- `setOptions(options: Partial<HorizontalBarChartOptions>)` - Update options
- `resize(width?: number, height?: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### VerticalBarChart

```typescript
new VerticalBarChart(container: HTMLElement, data: VerticalBarData[], options?: VerticalBarChartOptions)
```

**Data:**

```typescript
interface VerticalBarData {
  label: string;
  value: number;
  color?: string;
}
```

**Options:**

| Option           | Type     | Default      | Description                            |
| ---------------- | -------- | ------------ | -------------------------------------- |
| `width`          | number   | 400          | Canvas width (px)                      |
| `height`         | number   | 300          | Canvas height (px)                     |
| `barThickness`   | number   | 0.6          | Bar thickness ratio (0-1)              |
| `barRadius`      | number   | 4            | Top corner radius                      |
| `yDomain`        | [number, number] or 'auto' | 'auto' | Y-axis range           |
| `yTickCount`     | number   | 5            | Number of Y-axis ticks                 |
| `allowDecimals`  | boolean  | false        | Allow decimal values on Y-axis         |
| `showGrid`       | boolean  | true         | Show horizontal grid lines             |
| `gridDash`       | number[] | [3, 3]       | Grid line dash pattern                 |
| `xAxisHeight`    | number   | 30           | Space for X-axis labels                |
| `tooltip`        | object/false | false     | Tooltip configuration                  |
| `animate`        | boolean  | true         | Enable animation                       |
| `duration`       | number   | 500          | Animation duration (ms)                |

**Methods:**

- `setData(data: VerticalBarData[])` - Update data with animation
- `setOptions(options: Partial<VerticalBarChartOptions>)` - Update options
- `resize(width?: number, height?: number)` - Resize the chart
- `destroy()` - Cleanup and remove

### MultiLineChart

```typescript
new MultiLineChart(container: HTMLElement, data: MultiLineData[], options: MultiLineChartOptions)
```

**Data:**

```typescript
interface MultiLineData {
  timestamp: number; // Unix timestamp in milliseconds
  [key: string]: number | null; // Dynamic keys for each series
}

interface SeriesConfig {
  key: string; // Data key
  name: string; // Display name
  color: string; // Series color
  id?: string; // Optional unique identifier
}
```

**Options:**

| Option         | Type     | Default      | Description                            |
| -------------- | -------- | ------------ | -------------------------------------- |
| `width`        | number   | 600          | Canvas width (px)                      |
| `height`       | number   | 300          | Canvas height (px)                     |
| `margin`       | object   | { top: 20, right: 20, bottom: 30, left: 70 } | Margins |
| `series`       | SeriesConfig[] | required | Series configuration                |
| `lineWidth`    | number   | 1.5          | Line width                             |
| `lineType`     | string   | 'linear'     | 'linear', 'monotone', or 'step'        |
| `connectNulls` | boolean  | true         | Connect null values                    |
| `xAxis`        | object   | -            | X-axis configuration                   |
| `yAxis`        | object   | -            | Y-axis configuration                   |
| `showGrid`     | boolean  | true         | Show horizontal grid lines             |
| `gridDash`     | number[] | [3, 3]       | Grid line dash pattern                 |
| `tooltip`      | object/false | false     | Tooltip configuration                  |
| `animate`      | boolean  | true         | Enable animation                       |
| `duration`     | number   | 500          | Animation duration (ms)                |

**Methods:**

- `setData(data: MultiLineData[])` - Update data with animation
- `setSeries(series: SeriesConfig[])` - Update series configuration
- `setOptions(options: Partial<MultiLineChartOptions>)` - Update options
- `resize(width?: number, height?: number)` - Resize the chart
- `destroy()` - Cleanup and remove

## Framework Integration

### React

```tsx
import { useEffect, useRef } from "react";
import { GaugeChart } from "@mango0422/micro-charts";

function Gauge({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<GaugeChart>();

  useEffect(() => {
    if (ref.current) {
      chartRef.current = new GaugeChart(ref.current, { value });
      return () => chartRef.current?.destroy();
    }
  }, []);

  useEffect(() => {
    chartRef.current?.setData(value);
  }, [value]);

  return <div ref={ref} />;
}
```

### Vue 3

```vue
<template>
  <div ref="chartRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { GaugeChart } from "@mango0422/micro-charts";

const props = defineProps<{ value: number }>();
const chartRef = ref<HTMLDivElement>();
let chart: GaugeChart;

onMounted(() => {
  if (chartRef.value) {
    chart = new GaugeChart(chartRef.value, { value: props.value });
  }
});

onUnmounted(() => {
  chart?.destroy();
});

watch(
  () => props.value,
  (newValue) => {
    chart?.setData(newValue);
  }
);
</script>
```

## Performance

### Benchmarks

Rendering performance on typical hardware (tested with various data sizes):

| Data Points | Multi-Line | Bar Charts | Pie/Gauge |
|-------------|------------|------------|-----------|
| 100         | <5ms       | <3ms       | <2ms      |
| 1,000       | <15ms      | <8ms       | <5ms      |
| 10,000      | <50ms      | <30ms      | <20ms     |
| 100,000     | <500ms     | N/A*       | N/A*      |

*Bar and Pie charts aren't practical with 100K+ items

### Bundle Size Comparison

| Library        | Bundle Size | Dependencies | Chart Types | Best For |
| -------------- | ----------- | ------------ | ----------- | -------- |
| **Micro Charts** | ~60KB (18KB gzipped) | 0 | 11 | Dashboards, KPIs |
| uPlot          | ~50KB (15KB gzipped) | 0 | 1 (time-series) | Large time-series only |
| Chart.js       | ~200KB      | 0            | 8 | General purpose |
| recharts       | ~500KB      | 10+          | 20+ | React apps, rich features |

### Performance Optimizations

- **Canvas Rendering**: Hardware-accelerated, HiDPI-aware
- **Style Caching**: Minimize Canvas API calls by caching fill/stroke styles
- **Global RAF Scheduler**: Batch all animations and renders in single requestAnimationFrame loop
- **Zero-Allocation Loops**: Avoid GC pressure with index-based iteration
- **Geometry Caching**: Pre-calculate bar rectangles and layout values

### When to Use What

**Use Micro Charts if:**
- Building dashboards or monitoring UIs
- Need variety (gauge, pie, bar, time-series)
- Working with <10K data points per chart
- Want minimal bundle size impact

**Use uPlot if:**
- Only need time-series charts
- Dealing with 100K+ data points
- Performance is absolutely critical
- Can sacrifice chart variety for speed

**Use recharts if:**
- Already using React
- Need extensive customization
- Want rich interactions (zoom, brush, etc.)
- Bundle size isn't a concern

### Running Benchmarks

```bash
npm run build
open benchmark/index.html
```

See [benchmark/README.md](benchmark/README.md) for details.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev
```

## Inspiration

Performance optimizations inspired by [uPlot](https://github.com/leeoniya/uPlot):
- Canvas-based rendering
- Style caching
- Global RAF scheduler
- Zero-allocation loops

## License

MIT © mango0422
