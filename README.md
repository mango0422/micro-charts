# Micro Charts

> Lightweight, zero-dependency chart library for modern browsers.
> Inspired by uPlot's philosophy: minimal bundle, maximum performance.

[![npm version](https://img.shields.io/npm/v/@mango0422/micro-charts.svg)](https://www.npmjs.com/package/@mango0422/micro-charts)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mango0422/micro-charts.svg)](https://bundlephobia.com/package/@mango0422/micro-charts)

## Features

- **Tiny**: ~4KB gzipped (all charts included)
- **Zero dependencies**: Completely standalone
- **Fast**: Canvas-based rendering, 60fps animations
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
| Progress                | ❌    | ✅           |

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
