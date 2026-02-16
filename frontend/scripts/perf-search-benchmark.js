/**
 * Search Page Performance Benchmark
 *
 * Measures the backend API response time for hotel search requests
 * and compares cached vs uncached performance.
 *
 * Usage:
 *   node scripts/perf-search-benchmark.js
 *   node scripts/perf-search-benchmark.js --production
 *   node scripts/perf-search-benchmark.js --destination "Dubai"
 */

const https = require('https');
const http = require('http');

// ═══════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════
const isProduction = false; // Only test against local backend
const customDest = process.argv.find((a, i) => process.argv[i - 1] === '--destination');
const skipCacheClear = process.argv.includes('--warm'); // Use --warm to test with pre-warmed cache

const API_BASE = 'http://localhost:5001/api';

const SITE_URL = 'http://localhost:3000';

const DESTINATIONS = customDest ? [customDest] : ['Riyadh', 'Dubai', 'Mecca', 'Cairo'];

// Tomorrow + day after
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 2);
const checkin = tomorrow.toISOString().split('T')[0];
const checkout = dayAfter.toISOString().split('T')[0];

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function ratingBar(ms) {
  if (ms < 500) return colorize('████████████ FAST', 'green');
  if (ms < 1000) return colorize('████████░░░░ OK', 'green');
  if (ms < 2000) return colorize('██████░░░░░░ MODERATE', 'yellow');
  if (ms < 4000) return colorize('████░░░░░░░░ SLOW', 'yellow');
  if (ms < 8000) return colorize('██░░░░░░░░░░ VERY SLOW', 'red');
  return colorize('█░░░░░░░░░░░ CRITICAL', 'red');
}

/**
 * Make an HTTP/HTTPS GET request and measure timing
 */
function timedFetch(url, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout }, (res) => {
      const dnsTime = performance.now() - startTime;
      let data = '';

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const totalTime = performance.now() - startTime;
        try {
          const json = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            totalTime: Math.round(totalTime),
            dnsConnectTime: Math.round(dnsTime),
            dataSize: Buffer.byteLength(data, 'utf-8'),
            hotelCount: json?.data?.hotels?.length || 0,
            totalHotels: json?.data?.total || 0,
            fromCache: json?.data?.fromCache || false,
            success: json?.success || false,
            message: json?.message || '',
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            totalTime: Math.round(totalTime),
            dataSize: Buffer.byteLength(data, 'utf-8'),
            hotelCount: 0,
            error: 'Invalid JSON response',
          });
        }
      });
    });

    req.on('error', (err) => {
      const totalTime = performance.now() - startTime;
      resolve({
        totalTime: Math.round(totalTime),
        error: err.message,
        hotelCount: 0,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const elapsed = Math.round(performance.now() - startTime);
      resolve({
        totalTime: elapsed,
        error: `Request timeout (${Math.round(timeout/1000)}s)`,
        hotelCount: 0,
      });
    });
  });
}

/**
 * Measure static asset loading time (HTML page)
 */
function measurePageLoad(url) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        measurePageLoad(res.headers.location).then(resolve).catch(reject);
        return;
      }
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const totalTime = performance.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          totalTime: Math.round(totalTime),
          dataSize: Buffer.byteLength(data, 'utf-8'),
        });
      });
    });
    req.on('error', (err) => resolve({ error: err.message, totalTime: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout', totalTime: 15000 }); });
  });
}

// ═══════════════════════════════════════════════════════
// Benchmark Tests
// ═══════════════════════════════════════════════════════

async function runBenchmark() {
  console.log('\n' + colorize('═══════════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('  GAITH TOURS — Search Page Performance Benchmark', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════════════════', 'cyan'));
  console.log(`  API:  ${colorize(API_BASE, 'dim')}`);
  console.log(`  Site: ${colorize(SITE_URL, 'dim')}`);
  console.log(`  Date: ${checkin} → ${checkout}`);
  console.log(`  Destinations: ${DESTINATIONS.join(', ')}`);
  console.log(`  Mode: ${skipCacheClear ? colorize('WARM (testing pre-warmed cache)', 'green') : colorize('COLD (cache cleared first)', 'yellow')}`);
  console.log();

  // Clear cache before benchmarking (unless --warm flag is used)
  if (!skipCacheClear) {
    console.log(colorize('┌─ Clearing server cache for accurate cold measurement...', 'dim'));
    const clearResult = await timedFetch(`${API_BASE}/hotels/clear-cache`, 5000);
    if (clearResult.error) {
      // POST endpoint - try with http.request
      await new Promise((resolve) => {
        const req = http.request(`${API_BASE}/hotels/clear-cache`, { method: 'POST', timeout: 5000 }, (res) => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => {
            console.log(`│  Cache cleared: ${d.substring(0, 100)}`);
            resolve();
          });
        });
        req.on('error', () => { console.log('│  Could not clear cache (non-fatal)'); resolve(); });
        req.end();
      });
    }
    console.log(colorize('└──────────────────────────────────────────────', 'dim'));
    console.log();
  }

  const results = [];

  // ───────────────────────────────────────────────
  // Test 1: HTML Page Load Time
  // ───────────────────────────────────────────────
  console.log(colorize('┌─ Test 1: HTML Page Load (initial document)', 'blue'));
  const searchPageUrl = `${SITE_URL}/hotels/search?destination=Riyadh&checkIn=${checkin}&checkOut=${checkout}&rooms=1&adults=2`;
  const pageResult = await measurePageLoad(searchPageUrl);
  if (pageResult.error) {
    console.log(`│  ${colorize('ERROR: ' + pageResult.error, 'red')}`);
    console.log(`│  (Make sure the ${isProduction ? 'production site' : 'dev server'} is running)`);
  } else {
    console.log(`│  Status:    ${pageResult.statusCode}`);
    console.log(`│  Time:      ${colorize(pageResult.totalTime + 'ms', pageResult.totalTime < 500 ? 'green' : 'yellow')}`);
    console.log(`│  HTML Size: ${(pageResult.dataSize / 1024).toFixed(1)} KB`);
    console.log(`│  Rating:    ${ratingBar(pageResult.totalTime)}`);
  }
  console.log(colorize('└──────────────────────────────────────────────', 'blue'));
  console.log();

  // ───────────────────────────────────────────────
  // Test 2: API Search — Cold (no cache) vs Warm (cached)
  // ───────────────────────────────────────────────
  console.log(colorize('┌─ Test 2: API Search Speed (per destination)', 'blue'));
  console.log(colorize('│  Testing each destination: 1st call (cold) + 2nd call (cached)', 'dim'));
  console.log('│');

  for (const dest of DESTINATIONS) {
    const url = `${API_BASE}/hotels/search?destination=${encodeURIComponent(dest)}&checkin=${checkin}&checkout=${checkout}&adults=2&page=1&limit=20&currency=SAR`;

    // First call (may be cold / uncached)
    const call1 = await timedFetch(url);
    // Second call (should be cached)
    const call2 = await timedFetch(url);

    const speedup = call1.totalTime > 0 ? ((call1.totalTime - call2.totalTime) / call1.totalTime * 100).toFixed(0) : 0;

    console.log(`│  ${colorize(dest.padEnd(15), 'bold')}`);
    console.log(`│    1st call:  ${colorize(call1.totalTime + 'ms', call1.totalTime < 2000 ? 'green' : call1.totalTime < 5000 ? 'yellow' : 'red')}  ${call1.hotelCount} hotels  ${call1.fromCache ? '(cached)' : '(fresh)'}  ${ratingBar(call1.totalTime)}`);
    console.log(`│    2nd call:  ${colorize(call2.totalTime + 'ms', call2.totalTime < 500 ? 'green' : call2.totalTime < 2000 ? 'yellow' : 'red')}  ${call2.hotelCount} hotels  ${call2.fromCache ? '(cached)' : '(fresh)'}  ${ratingBar(call2.totalTime)}`);
    console.log(`│    Speedup:   ${colorize(speedup + '% faster on cache', 'cyan')}  |  Data: ${(call1.dataSize / 1024).toFixed(0)} KB`);
    if (call1.error) console.log(`│    ${colorize('ERROR: ' + call1.error, 'red')}`);
    console.log('│');

    results.push({
      destination: dest,
      coldMs: call1.totalTime,
      warmMs: call2.totalTime,
      hotelCount: call1.hotelCount || call2.hotelCount,
      totalHotels: call1.totalHotels || call2.totalHotels,
      dataSizeKB: Math.round(call1.dataSize / 1024),
      fromCache1: call1.fromCache,
      fromCache2: call2.fromCache,
      error: call1.error || call2.error || null,
    });
  }
  console.log(colorize('└──────────────────────────────────────────────', 'blue'));
  console.log();

  // ───────────────────────────────────────────────
  // Test 3: Pagination Speed
  // ───────────────────────────────────────────────
  console.log(colorize('┌─ Test 3: Pagination Speed (Riyadh, pages 1-3)', 'blue'));
  for (let page = 1; page <= 3; page++) {
    const url = `${API_BASE}/hotels/search?destination=Riyadh&checkin=${checkin}&checkout=${checkout}&adults=2&page=${page}&limit=20&currency=SAR`;
    const result = await timedFetch(url);
    console.log(`│  Page ${page}:  ${colorize(result.totalTime + 'ms', result.totalTime < 500 ? 'green' : 'yellow')}  ${result.hotelCount} hotels  ${result.fromCache ? '(cached)' : '(fresh)'}  ${ratingBar(result.totalTime)}`);
  }
  console.log(colorize('└──────────────────────────────────────────────', 'blue'));
  console.log();

  // ───────────────────────────────────────────────
  // Test 4: Filter Speed (cached data + filters)
  // ───────────────────────────────────────────────
  console.log(colorize('┌─ Test 4: Filter Speed (Riyadh, cached + filters)', 'blue'));
  const filterTests = [
    { name: 'No filters', params: '' },
    { name: '5-star only', params: '&starRating=5' },
    { name: 'Free WiFi + Pool', params: '&facilities=free_wifi,pool' },
    { name: 'Breakfast included', params: '&mealPlan=breakfast' },
    { name: 'Free cancellation', params: '&cancellationPolicy=free_cancellation' },
    { name: 'Rating 8+', params: '&guestRating=8' },
  ];

  for (const test of filterTests) {
    const url = `${API_BASE}/hotels/search?destination=Riyadh&checkin=${checkin}&checkout=${checkout}&adults=2&page=1&limit=20&currency=SAR${test.params}`;
    const result = await timedFetch(url);
    console.log(`│  ${test.name.padEnd(25)}  ${colorize(result.totalTime + 'ms', result.totalTime < 500 ? 'green' : 'yellow')}  ${result.hotelCount} hotels  ${ratingBar(result.totalTime)}`);
  }
  console.log(colorize('└──────────────────────────────────────────────', 'blue'));
  console.log();

  // ───────────────────────────────────────────────
  // Test 5: Autocomplete / Suggest Speed
  // ───────────────────────────────────────────────
  console.log(colorize('┌─ Test 5: Autocomplete Speed (/hotels/suggest)', 'blue'));
  const suggestQueries = ['Riy', 'Dubai', 'القاهرة', 'Lon'];
  for (const q of suggestQueries) {
    const url = `${API_BASE}/hotels/suggest?query=${encodeURIComponent(q)}&language=en`;
    const result = await timedFetch(url, 60000);
    console.log(`│  "${q.padEnd(10)}"  ${colorize(result.totalTime + 'ms', result.totalTime < 300 ? 'green' : result.totalTime < 800 ? 'yellow' : 'red')}  ${ratingBar(result.totalTime)}`);
  }
  console.log(colorize('└──────────────────────────────────────────────', 'blue'));
  console.log();

  // ───────────────────────────────────────────────
  // Summary
  // ───────────────────────────────────────────────
  console.log(colorize('═══════════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('  SUMMARY', 'bold'));
  console.log(colorize('═══════════════════════════════════════════════════════════', 'cyan'));

  const validResults = results.filter(r => !r.error);
  if (validResults.length > 0) {
    const avgCold = Math.round(validResults.reduce((s, r) => s + r.coldMs, 0) / validResults.length);
    const avgWarm = Math.round(validResults.reduce((s, r) => s + r.warmMs, 0) / validResults.length);
    const avgData = Math.round(validResults.reduce((s, r) => s + r.dataSizeKB, 0) / validResults.length);

    console.log(`  Avg Cold API:    ${colorize(avgCold + 'ms', avgCold < 3000 ? 'yellow' : 'red')}  ${ratingBar(avgCold)}`);
    console.log(`  Avg Cached API:  ${colorize(avgWarm + 'ms', avgWarm < 500 ? 'green' : 'yellow')}  ${ratingBar(avgWarm)}`);
    console.log(`  Avg Data Size:   ${avgData} KB per search response`);
    console.log();

    // Estimate total time-to-content on search page
    const htmlTime = pageResult?.totalTime || 200;
    const jsParseEst = 800; // ~2MB JS bundle parse time estimate
    const reactMountEst = 150; // React mount + render

    console.log(colorize('  Estimated Time-to-Content (Search Page):', 'bold'));
    console.log(colorize('  ──────────────────────────────────────────', 'dim'));
    console.log(`  1. HTML download:         ${colorize(htmlTime + 'ms', 'dim')}`);
    console.log(`  2. CSS + JS download:     ${colorize('~500-1200ms', 'dim')}   (2MB bundle)`);
    console.log(`  3. JS parse & execute:    ${colorize('~' + jsParseEst + 'ms', 'dim')}`);
    console.log(`  4. React mount:           ${colorize('~' + reactMountEst + 'ms', 'dim')}`);
    console.log(`  5. API call (cold):       ${colorize(avgCold + 'ms', avgCold < 3000 ? 'yellow' : 'red')}`);
    console.log(`  5. API call (cached):     ${colorize(avgWarm + 'ms', avgWarm < 500 ? 'green' : 'yellow')}`);
    console.log(`  6. Render hotels:         ${colorize('~100ms', 'dim')}`);
    console.log(colorize('  ──────────────────────────────────────────', 'dim'));

    const totalCold = htmlTime + 800 + jsParseEst + reactMountEst + avgCold + 100;
    const totalWarm = htmlTime + 800 + jsParseEst + reactMountEst + avgWarm + 100;

    console.log(`  ${colorize('TOTAL (cold):', 'bold')}  ${colorize('~' + totalCold + 'ms', totalCold < 4000 ? 'yellow' : 'red')}  ${ratingBar(totalCold)}`);
    console.log(`  ${colorize('TOTAL (cached):', 'bold')} ${colorize('~' + totalWarm + 'ms', totalWarm < 3000 ? 'green' : 'yellow')}  ${ratingBar(totalWarm)}`);
    console.log();

    // Recommendations
    console.log(colorize('  Bottleneck Analysis:', 'bold'));
    if (avgCold > 3000) {
      console.log(colorize('  ⚠ Cold API calls are slow (>3s). RateHawk API latency is the bottleneck.', 'yellow'));
      console.log(colorize('    → Consider: background pre-warming cache for popular destinations', 'dim'));
    }
    if (avgWarm > 500) {
      console.log(colorize('  ⚠ Even cached responses are slow (>500ms). Possible network latency or large payloads.', 'yellow'));
      console.log(colorize('    → Consider: compressing API responses, reducing payload fields', 'dim'));
    }
    if (avgData > 200) {
      console.log(colorize(`  ⚠ API responses are large (~${avgData}KB). Consider trimming unused fields.`, 'yellow'));
    }
    if (avgWarm < 200) {
      console.log(colorize('  ✓ Cached API is fast (<200ms). The API is not the bottleneck.', 'green'));
    }
  }

  console.log();
  console.log(colorize('═══════════════════════════════════════════════════════════', 'cyan'));
}

// Run
runBenchmark().catch(console.error);
