#!/usr/bin/env node
/**
 * Bundle Size Reporter
 *
 * Reports the size of all bundle outputs for tracking and CI purposes.
 * Run: node scripts/bundle-size.js
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const distDir = path.join(__dirname, '..', 'dist');

// Bundle size thresholds (in KB)
const THRESHOLDS = {
  'index.global.js': 100,    // IIFE bundle
  'index.cjs': 100,          // CJS main bundle
  'index.js': 100,           // ESM main bundle
  // Individual chart bundles should be small
  'bar.cjs': 8,
  'gauge.cjs': 8,
  'pie.cjs': 8,
  'progress.cjs': 6,
  'multi-line.cjs': 18,
  'horizontal-bar.cjs': 14,
  'vertical-bar.cjs': 14,
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return null;
  }
}

function getGzipSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content);
    return gzipped.length;
  } catch {
    return null;
  }
}

function getBundleSizes() {
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const files = fs.readdirSync(distDir).filter(f =>
    f.endsWith('.js') || f.endsWith('.cjs')
  );

  const results = [];

  for (const file of files) {
    const filePath = path.join(distDir, file);
    const size = getFileSize(filePath);
    const gzipSize = getGzipSize(filePath);

    if (size !== null) {
      const threshold = THRESHOLDS[file];
      const sizeKB = size / 1024;
      const exceedsThreshold = threshold && sizeKB > threshold;

      results.push({
        file,
        size,
        sizeFormatted: formatSize(size),
        gzipSize,
        gzipFormatted: gzipSize ? formatSize(gzipSize) : 'N/A',
        threshold: threshold ? `${threshold} KB` : '-',
        status: exceedsThreshold ? '⚠️ EXCEEDS' : '✓'
      });
    }
  }

  return results.sort((a, b) => b.size - a.size);
}

function generateReport() {
  const results = getBundleSizes();

  console.log('\n📦 Bundle Size Report\n');
  console.log('=' .repeat(80));

  // Summary
  const mainBundles = ['index.global.js', 'index.cjs', 'index.js'];
  const mainResults = results.filter(r => mainBundles.includes(r.file));

  console.log('\n🎯 Main Bundles:\n');

  for (const r of mainResults) {
    console.log(`  ${r.file.padEnd(20)} ${r.sizeFormatted.padStart(12)} (gzip: ${r.gzipFormatted.padStart(10)}) ${r.status}`);
  }

  // Individual chart bundles
  const chartBundles = results.filter(r =>
    !mainBundles.includes(r.file) &&
    !r.file.startsWith('chunk-') &&
    r.file.endsWith('.cjs')
  );

  console.log('\n📊 Individual Chart Bundles (CJS):\n');

  for (const r of chartBundles) {
    console.log(`  ${r.file.padEnd(25)} ${r.sizeFormatted.padStart(12)} (gzip: ${r.gzipFormatted.padStart(10)})`);
  }

  // Total sizes
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const totalGzip = results.reduce((sum, r) => sum + (r.gzipSize || 0), 0);

  console.log('\n' + '=' .repeat(80));
  console.log(`\n📈 Total dist size: ${formatSize(totalSize)} (gzip: ${formatSize(totalGzip)})`);

  // Check for threshold violations
  const violations = results.filter(r => r.status.includes('EXCEEDS'));

  if (violations.length > 0) {
    console.log('\n⚠️  Bundle size threshold violations:');
    for (const v of violations) {
      console.log(`   - ${v.file}: ${v.sizeFormatted} > ${v.threshold}`);
    }
    console.log('');
    return 1;
  }

  console.log('\n✅ All bundle sizes within thresholds\n');
  return 0;
}

// Generate JSON output for CI
function generateJsonReport() {
  const results = getBundleSizes();
  const output = {
    timestamp: new Date().toISOString(),
    bundles: results.map(r => ({
      file: r.file,
      size: r.size,
      gzipSize: r.gzipSize,
      threshold: THRESHOLDS[r.file] || null
    }))
  };

  return JSON.stringify(output, null, 2);
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--json')) {
  console.log(generateJsonReport());
} else {
  const exitCode = generateReport();
  process.exit(exitCode);
}
