#!/usr/bin/env node
/**
 * Performance Benchmark Script
 *
 * Measures chart rendering performance using synthetic data.
 * Requires: npm install -D jsdom canvas
 *
 * Usage: node scripts/benchmark.js [--quick] [--json]
 */

// Check for required dependencies
let jsdom, createCanvas;
try {
  jsdom = require('jsdom');
  createCanvas = require('canvas').createCanvas;
} catch (e) {
  console.log('⚠️  Optional benchmark dependencies not installed.');
  console.log('   To run benchmarks, install: npm install -D jsdom canvas');
  console.log('   For browser-based benchmarks, open benchmark/index.html');
  process.exit(0);
}

const { JSDOM } = jsdom;
const path = require('path');

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="chart"></div></body></html>', {
  pretendToBeVisual: true,
  resources: 'usable',
});

global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock canvas
const originalCreateElement = document.createElement.bind(document);
document.createElement = (tagName) => {
  if (tagName.toLowerCase() === 'canvas') {
    const canvas = createCanvas(800, 600);
    canvas.style = {};
    canvas.addEventListener = () => {};
    canvas.removeEventListener = () => {};
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
    return canvas;
  }
  return originalCreateElement(tagName);
};

// Import charts
const MicroCharts = require('../dist/index.cjs');

// Benchmark configurations
const CONFIGS = [
  { name: 'MultiLine', points: [100, 1000, 5000, 10000] },
  { name: 'VerticalBar', points: [10, 50, 100, 200] },
  { name: 'HorizontalBar', points: [10, 50, 100, 200] },
  { name: 'Pie', points: [5, 10, 20, 50] },
];

const QUICK_CONFIGS = [
  { name: 'MultiLine', points: [100, 1000] },
  { name: 'VerticalBar', points: [10, 50] },
];

// Data generators
function generateMultiLineData(count) {
  const data = [];
  const startTime = Date.now() - count * 1000;

  for (let i = 0; i < count; i++) {
    data.push({
      timestamp: startTime + i * 1000,
      series1: 20 + Math.sin(i / 10) * 10 + Math.random() * 5,
      series2: 30 + Math.cos(i / 8) * 15 + Math.random() * 5,
      series3: 25 + Math.sin(i / 12) * 8 + Math.random() * 3,
    });
  }

  return {
    data,
    series: [
      { key: 'series1', name: 'Series 1', color: '#3b82f6' },
      { key: 'series2', name: 'Series 2', color: '#ef4444' },
      { key: 'series3', name: 'Series 3', color: '#10b981' },
    ],
  };
}

function generateBarData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      label: `Item ${i + 1}`,
      value: Math.random() * 100,
    });
  }
  return data;
}

function generatePieData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      label: `Segment ${i + 1}`,
      value: Math.random() * 100,
    });
  }
  return data;
}

// Benchmark runner
function runBenchmark(chartName, pointCount, iterations = 5) {
  const container = document.getElementById('chart');
  const times = [];

  for (let i = 0; i < iterations; i++) {
    // Generate data
    let chart;
    const start = process.hrtime.bigint();

    switch (chartName) {
      case 'MultiLine': {
        const { data, series } = generateMultiLineData(pointCount);
        chart = new MicroCharts.MultiLineChart(container, data, {
          width: 800,
          height: 400,
          series,
          animate: false,
        });
        break;
      }
      case 'VerticalBar': {
        const data = generateBarData(pointCount);
        chart = new MicroCharts.VerticalBarChart(container, data, {
          width: 800,
          height: 400,
          animate: false,
        });
        break;
      }
      case 'HorizontalBar': {
        const data = generateBarData(pointCount);
        chart = new MicroCharts.HorizontalBarChart(container, data, {
          width: 800,
          height: 400,
          animate: false,
        });
        break;
      }
      case 'Pie': {
        const data = generatePieData(pointCount);
        chart = new MicroCharts.PieChart(container, data, {
          width: 400,
          height: 400,
          animate: false,
        });
        break;
      }
    }

    const end = process.hrtime.bigint();
    const timeMs = Number(end - start) / 1_000_000;
    times.push(timeMs);

    // Cleanup
    if (chart && chart.destroy) {
      chart.destroy();
    }
    container.innerHTML = '';
  }

  // Calculate stats
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const min = times[0];
  const max = times[times.length - 1];
  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  return { median, min, max, avg };
}

// Performance thresholds (in ms)
const THRESHOLDS = {
  'MultiLine-100': 50,
  'MultiLine-1000': 100,
  'MultiLine-5000': 300,
  'MultiLine-10000': 500,
  'VerticalBar-10': 20,
  'VerticalBar-50': 30,
  'VerticalBar-100': 50,
  'VerticalBar-200': 100,
  'HorizontalBar-10': 20,
  'HorizontalBar-50': 30,
  'HorizontalBar-100': 50,
  'HorizontalBar-200': 100,
  'Pie-5': 20,
  'Pie-10': 25,
  'Pie-20': 35,
  'Pie-50': 50,
};

// Main
async function main() {
  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isJson = args.includes('--json');

  const configs = isQuick ? QUICK_CONFIGS : CONFIGS;
  const results = [];

  if (!isJson) {
    console.log('\n⏱️  Performance Benchmark\n');
    console.log('=' .repeat(70));
  }

  for (const config of configs) {
    for (const points of config.points) {
      const key = `${config.name}-${points}`;
      const result = runBenchmark(config.name, points);
      const threshold = THRESHOLDS[key];
      const passed = !threshold || result.median <= threshold;

      results.push({
        chart: config.name,
        points,
        median: result.median,
        min: result.min,
        max: result.max,
        avg: result.avg,
        threshold,
        passed,
      });

      if (!isJson) {
        const status = passed ? '✓' : '⚠️';
        console.log(
          `  ${status} ${config.name.padEnd(15)} ${String(points).padStart(6)} pts: ` +
            `${result.median.toFixed(2).padStart(8)}ms (min: ${result.min.toFixed(2)}ms, max: ${result.max.toFixed(2)}ms)`
        );
      }
    }
  }

  if (isJson) {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
    return;
  }

  console.log('\n' + '=' .repeat(70));

  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0) {
    console.log('\n⚠️  Performance threshold violations:');
    for (const f of failures) {
      console.log(`   - ${f.chart} (${f.points} pts): ${f.median.toFixed(2)}ms > ${f.threshold}ms`);
    }
    process.exit(1);
  }

  console.log('\n✅ All benchmarks passed\n');
}

main().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
