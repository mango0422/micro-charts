# Performance Benchmarks

This directory contains performance benchmarking tools for micro-charts.

## Running Benchmarks

1. Build the project:
   ```bash
   npm run build
   ```

2. Open `benchmark/index.html` in a browser (Chrome recommended for memory metrics)

3. Select a chart type and data size, then click "Run Benchmark"

## Benchmark Metrics

The benchmark measures:

- **Initial Render Time**: Time to create and render the chart
- **Update Time**: Time to update chart with new data using `setData()`
- **Memory Usage**: Approximate heap size delta (Chrome only)

## Test Configurations

| Data Points | Use Case | Expected Performance |
|-------------|----------|---------------------|
| 100 | Small dashboard widgets | <5ms |
| 1,000 | Standard charts | <15ms |
| 10,000 | Large datasets | <50ms |
| 100,000 | Stress test | <500ms* |

*Performance depends on chart type and hardware

## Comparison Guidelines

### When to use Micro Charts
- Dashboard KPIs and monitoring widgets
- Up to ~10,000 data points
- Need diverse chart types (gauge, pie, bar, etc.)
- Bundle size is critical (<100KB total)

### When to use uPlot
- Time-series data only
- 100,000+ data points
- Need maximum performance for large datasets
- Bundle size not a concern

### When to use recharts
- Complex interactive features needed
- Extensive customization required
- React-first projects
- Bundle size not a concern (~500KB)

## Running All Benchmarks

Click "Run All Combinations" to test all chart types with various data sizes. Results will be logged to the console in table format.

## Automated Benchmarks

To run automated benchmarks across multiple configurations, you can use the browser's console:

```javascript
// Copy results from console.table() output
// Use for documentation or comparison
```

## Performance Tips

1. **Batch Updates**: Update multiple values at once rather than calling `setData()` repeatedly
2. **Animation**: Disable animations for large datasets by setting `duration: 0`
3. **Decimation**: For time-series with >10K points, consider downsampling data
4. **Canvas Size**: Smaller canvas sizes render faster
