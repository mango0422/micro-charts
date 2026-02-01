# Micro Charts

> Lightweight, zero-dependency chart library for modern browsers.
> Inspired by uPlot's philosophy: minimal bundle, maximum performance.

[![npm version](https://img.shields.io/npm/v/@mango0422/micro-charts.svg)](https://www.npmjs.com/package/@mango0422/micro-charts)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mango0422/micro-charts.svg)](https://bundlephobia.com/package/@mango0422/micro-charts)

## Features

- **Tiny**: ~11KB gzipped (8 charts included), individual charts 1-3KB
- **Zero dependencies**: Completely standalone
- **Fast**: Canvas-based rendering, 60fps animations, optimized with global rAF scheduler
- **Tree-shakeable**: Import only what you need
- **Flexible**: Framework-agnostic (Vanilla JS/TS)
- **TypeScript**: Full type definitions included
- **Easy**: Simple, uPlot-inspired API

## Why Micro Charts?

**uPlot** excels at time-series charts. **Micro Charts** complements it with non-time-series visualizations:

| Chart Type              | uPlot | Micro Charts |
| ----------------------- | ----- | ------------ |
| Line/Area (time-series) | ✅    | ❌           |
| Gauge                   | ❌    | ✅           |
| Pie/Donut               | ❌    | ✅           |
| Bar (categorical)       | ❌    | ✅           |
| Stacked Bar             | ❌    | ✅           |
| Progress                | ❌    | ✅           |
| Heat Map                | ❌    | ✅           |
| Radar/Spider            | ❌    | ✅           |
| Funnel                  | ❌    | ✅           |

Use together to replace heavy libraries like Chart.js, recharts, or amCharts.

## Installation

```bash
npm install @mango0422/micro-charts
# or
pnpm add @mango0422/micro-charts
# or
yarn add @mango0422/micro-charts
```

### CDN (UMD)

```html
<script src="https://unpkg.com/@mango0422/micro-charts"></script>
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

Comparison with popular libraries:

| Library        | Bundle Size | Dependencies | Render Time |
| -------------- | ----------- | ------------ | ----------- |
| Micro Charts   | ~11KB       | 0            | <10ms       |
| Chart.js       | ~200KB      | 0            | ~50ms       |
| recharts       | ~500KB      | 10+          | ~100ms      |
| amCharts       | ~300KB+     | 0            | ~50ms       |

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev
```

## License

MIT © mango0422

## Credits

Inspired by [uPlot](https://github.com/leeoniya/uPlot) by Leon Sorokin
