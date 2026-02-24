/**
 * RateHawk Search API Speed Test
 * ================================
 * Tests the response time of RateHawk's search (SERP) and prebook APIs.
 *
 * Context: RateHawk configured timeouts:
 *   - Search timeout: 20 seconds
 *   - Prebook timeout: 25 seconds
 *
 * Usage: node test_search_speed.js [--prebook] [--regions jeddah,makkah,riyadh]
 *
 * Options:
 *   --prebook     Also test prebook speed using the first match_hash from each search
 *   --regions     Comma-separated list of region keys to test (default: all)
 *   --rounds      Number of test rounds per region (default: 1)
 *   --currency    Currency code (default: SAR)
 */

const axios = require('axios');
require('dotenv').config();

// ─── Configuration ──────────────────────────────────────────────
const KEY_ID = process.env.RATEHAWK_KEY_ID;
const API_KEY = process.env.RATEHAWK_API_KEY;
const BASE_URL = 'https://api.worldota.net/api/b2b/v3';

// Timeout thresholds (from RateHawk email - Feb 24, 2026)
const SEARCH_TIMEOUT_THRESHOLD = 20000;  // 20 seconds
const PREBOOK_TIMEOUT_THRESHOLD = 25000; // 25 seconds

// ─── Test Destinations ──────────────────────────────────────────
const TEST_REGIONS = {
  jeddah:    { id: 2734, name: 'Jeddah, Saudi Arabia' },
  makkah:    { id: 2739, name: 'Makkah, Saudi Arabia' },
  madinah:   { id: 2735, name: 'Madinah, Saudi Arabia' },
  riyadh:    { id: 2742, name: 'Riyadh, Saudi Arabia' },
  dubai:     { id: 2734, name: 'Dubai, UAE' },       // Will be resolved via suggest
  istanbul:  { id: 895,  name: 'Istanbul, Turkey' },
  cairo:     { id: 2688, name: 'Cairo, Egypt' },
  london:    { id: 2114, name: 'London, UK' },
};

// ─── Colors ─────────────────────────────────────────────────────
const c = {
  reset:   '\x1b[0m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  bg: {
    red:   '\x1b[41m',
    green: '\x1b[42m',
    yellow:'\x1b[43m',
  }
};

// ─── Helpers ────────────────────────────────────────────────────
function formatMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}

function speedIndicator(ms, threshold) {
  const pct = (ms / threshold) * 100;
  if (pct <= 50) return `${c.green}■■■■■${c.reset} FAST`;
  if (pct <= 75) return `${c.green}■■■■${c.yellow}■${c.reset} OK`;
  if (pct <= 90) return `${c.yellow}■■■${c.reset}${c.dim}■■${c.reset} SLOW`;
  if (pct <= 100) return `${c.red}■■${c.reset}${c.dim}■■■${c.reset} NEAR LIMIT`;
  return `${c.bg.red}${c.white} EXCEEDED ${c.reset}`;
}

function getCheckinCheckout(daysFromNow = 14, nights = 3) {
  const checkin = new Date();
  checkin.setDate(checkin.getDate() + daysFromNow);
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + nights);

  const fmt = (d) => d.toISOString().split('T')[0];
  return { checkin: fmt(checkin), checkout: fmt(checkout) };
}

async function makeRequest(endpoint, data, timeoutMs = 30000) {
  const start = Date.now();
  try {
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}${endpoint}`,
      auth: { username: KEY_ID, password: API_KEY },
      headers: { 'Content-Type': 'application/json' },
      data,
      timeout: timeoutMs,
    });
    const elapsed = Date.now() - start;
    return { success: true, data: response.data, elapsed, status: response.status };
  } catch (error) {
    const elapsed = Date.now() - start;
    if (error.code === 'ECONNABORTED') {
      return { success: false, error: 'TIMEOUT', elapsed, status: null };
    }
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      elapsed,
      status: error.response?.status
    };
  }
}

// ─── Resolve region ID via suggest API ──────────────────────────
async function resolveRegionId(cityName) {
  const result = await makeRequest('/search/multicomplete/', {
    query: cityName,
    language: 'en'
  });

  if (result.success && result.data?.data?.regions?.length > 0) {
    const region = result.data.data.regions[0];
    return { id: region.id, name: region.name };
  }
  return null;
}

// ─── Test Search Speed ──────────────────────────────────────────
async function testSearch(regionId, regionName, params) {
  const { checkin, checkout } = params;
  const currency = params.currency || 'SAR';

  const payload = {
    region_id: regionId,
    checkin,
    checkout,
    residency: 'sa',
    language: 'en',
    guests: [{ adults: 2, children: [] }],
    currency
  };

  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.bold}🔍 SEARCH: ${regionName}${c.reset}`);
  console.log(`${c.dim}   Region ID: ${regionId} | ${checkin} → ${checkout} | Currency: ${currency}${c.reset}`);

  const result = await makeRequest('/search/serp/region/', payload, SEARCH_TIMEOUT_THRESHOLD + 5000);

  if (result.success) {
    const hotels = result.data?.data?.hotels || [];
    const indicator = speedIndicator(result.elapsed, SEARCH_TIMEOUT_THRESHOLD);

    console.log(`   ${c.bold}⏱️  Response Time: ${formatMs(result.elapsed)}${c.reset}  ${indicator}`);
    console.log(`   ${c.green}✅ Hotels Found: ${hotels.length}${c.reset}`);

    // Show rate count
    const totalRates = hotels.reduce((sum, h) => sum + (h.rates?.length || 0), 0);
    console.log(`   ${c.dim}   Total rates: ${totalRates} across ${hotels.length} hotels${c.reset}`);

    // Get first match_hash for prebook test
    const firstMatchHash = hotels[0]?.rates?.[0]?.match_hash || null;

    return {
      region: regionName,
      regionId,
      elapsed: result.elapsed,
      hotels: hotels.length,
      rates: totalRates,
      success: true,
      matchHash: firstMatchHash,
    };
  } else {
    console.log(`   ${c.red}❌ FAILED: ${result.error}${c.reset}`);
    console.log(`   ${c.dim}   Elapsed: ${formatMs(result.elapsed)}${c.reset}`);

    return {
      region: regionName,
      regionId,
      elapsed: result.elapsed,
      hotels: 0,
      rates: 0,
      success: false,
      error: result.error,
      matchHash: null,
    };
  }
}

// ─── Test Prebook Speed ─────────────────────────────────────────
async function testPrebook(matchHash, regionName) {
  if (!matchHash) {
    console.log(`\n${c.yellow}⚠️  PREBOOK: No match_hash available for ${regionName}, skipping${c.reset}`);
    return null;
  }

  console.log(`\n${c.magenta}   🔐 PREBOOK TEST for ${regionName}${c.reset}`);
  console.log(`${c.dim}   Hash: ${matchHash.substring(0, 40)}...${c.reset}`);

  const result = await makeRequest('/hotel/prebook', {
    hash: matchHash,
    language: 'en'
  }, PREBOOK_TIMEOUT_THRESHOLD + 5000);

  if (result.success) {
    const indicator = speedIndicator(result.elapsed, PREBOOK_TIMEOUT_THRESHOLD);
    const bookHash = result.data?.data?.hotels?.[0]?.rates?.[0]?.book_hash;

    console.log(`   ${c.bold}⏱️  Prebook Time: ${formatMs(result.elapsed)}${c.reset}  ${indicator}`);
    console.log(`   ${bookHash ? c.green + '✅ book_hash received' : c.yellow + '⚠️  No book_hash'}${c.reset}`);

    if (result.data?.error) {
      console.log(`   ${c.yellow}⚠️  API Error: ${result.data.error}${c.reset}`);
    }

    return {
      region: regionName,
      elapsed: result.elapsed,
      success: true,
      hasBookHash: !!bookHash,
      error: result.data?.error || null,
    };
  } else {
    console.log(`   ${c.red}❌ PREBOOK FAILED: ${result.error}${c.reset}`);
    console.log(`   ${c.dim}   Elapsed: ${formatMs(result.elapsed)}${c.reset}`);

    return {
      region: regionName,
      elapsed: result.elapsed,
      success: false,
      error: result.error,
    };
  }
}

// ─── Print Summary ──────────────────────────────────────────────
function printSummary(searchResults, prebookResults) {
  console.log(`\n\n${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║           RATEHAWK API SPEED TEST SUMMARY                    ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}\n`);

  // Search Results Table
  console.log(`${c.bold}📊 SEARCH API Results${c.reset}`);
  console.log(`${c.dim}   Timeout threshold: ${SEARCH_TIMEOUT_THRESHOLD / 1000}s${c.reset}\n`);

  console.log(`   ${'Region'.padEnd(30)} ${'Time'.padEnd(10)} ${'Hotels'.padEnd(10)} ${'Rates'.padEnd(10)} ${'Status'.padEnd(15)}`);
  console.log(`   ${'─'.repeat(30)} ${'─'.repeat(10)} ${'─'.repeat(10)} ${'─'.repeat(10)} ${'─'.repeat(15)}`);

  const successSearches = searchResults.filter(r => r.success);

  for (const r of searchResults) {
    const timeStr = formatMs(r.elapsed);
    const statusColor = r.success
      ? (r.elapsed <= SEARCH_TIMEOUT_THRESHOLD ? c.green : c.yellow)
      : c.red;
    const statusText = r.success
      ? (r.elapsed <= SEARCH_TIMEOUT_THRESHOLD ? '✅ OK' : '⚠️  SLOW')
      : `❌ ${r.error || 'FAIL'}`;

    console.log(`   ${r.region.padEnd(30)} ${statusColor}${timeStr.padEnd(10)}${c.reset} ${String(r.hotels).padEnd(10)} ${String(r.rates).padEnd(10)} ${statusColor}${statusText}${c.reset}`);
  }

  // Statistics
  if (successSearches.length > 0) {
    const times = successSearches.map(r => r.elapsed);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
    const p90 = times[Math.floor(times.length * 0.9)] || max;

    console.log(`\n   ${c.bold}Search Statistics:${c.reset}`);
    console.log(`   ├─ Average:  ${c.bold}${formatMs(avg)}${c.reset}`);
    console.log(`   ├─ Median:   ${formatMs(median)}`);
    console.log(`   ├─ Min:      ${c.green}${formatMs(min)}${c.reset}`);
    console.log(`   ├─ Max:      ${max > SEARCH_TIMEOUT_THRESHOLD ? c.red : c.yellow}${formatMs(max)}${c.reset}`);
    console.log(`   ├─ P90:      ${formatMs(p90)}`);
    console.log(`   └─ Within threshold: ${successSearches.filter(r => r.elapsed <= SEARCH_TIMEOUT_THRESHOLD).length}/${successSearches.length}`);
  }

  // Prebook Results
  if (prebookResults && prebookResults.length > 0) {
    const validPrebooks = prebookResults.filter(r => r !== null);

    console.log(`\n\n${c.bold}📊 PREBOOK API Results${c.reset}`);
    console.log(`${c.dim}   Timeout threshold: ${PREBOOK_TIMEOUT_THRESHOLD / 1000}s${c.reset}\n`);

    console.log(`   ${'Region'.padEnd(30)} ${'Time'.padEnd(10)} ${'Status'.padEnd(20)}`);
    console.log(`   ${'─'.repeat(30)} ${'─'.repeat(10)} ${'─'.repeat(20)}`);

    for (const r of validPrebooks) {
      const timeStr = formatMs(r.elapsed);
      const statusColor = r.success
        ? (r.elapsed <= PREBOOK_TIMEOUT_THRESHOLD ? c.green : c.yellow)
        : c.red;
      const statusText = r.success
        ? (r.hasBookHash ? '✅ OK' : `⚠️  ${r.error || 'No book_hash'}`)
        : `❌ ${r.error || 'FAIL'}`;

      console.log(`   ${r.region.padEnd(30)} ${statusColor}${timeStr.padEnd(10)}${c.reset} ${statusColor}${statusText}${c.reset}`);
    }

    const successPrebooks = validPrebooks.filter(r => r.success);
    if (successPrebooks.length > 0) {
      const times = successPrebooks.map(r => r.elapsed);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;

      console.log(`\n   ${c.bold}Prebook Statistics:${c.reset}`);
      console.log(`   ├─ Average:  ${c.bold}${formatMs(avg)}${c.reset}`);
      console.log(`   ├─ Min:      ${c.green}${formatMs(Math.min(...times))}${c.reset}`);
      console.log(`   ├─ Max:      ${formatMs(Math.max(...times))}`);
      console.log(`   └─ Within threshold: ${successPrebooks.filter(r => r.elapsed <= PREBOOK_TIMEOUT_THRESHOLD).length}/${successPrebooks.length}`);
    }
  }

  console.log(`\n${c.dim}Test completed at: ${new Date().toISOString()}${c.reset}`);
  console.log(`${c.dim}Thresholds: Search=${SEARCH_TIMEOUT_THRESHOLD/1000}s, Prebook=${PREBOOK_TIMEOUT_THRESHOLD/1000}s${c.reset}\n`);
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const testPrebooks = args.includes('--prebook');
  const roundsIdx = args.indexOf('--rounds');
  const rounds = roundsIdx !== -1 ? parseInt(args[roundsIdx + 1]) || 1 : 1;
  const regionsIdx = args.indexOf('--regions');
  const regionFilter = regionsIdx !== -1 ? args[regionsIdx + 1].split(',') : null;
  const currencyIdx = args.indexOf('--currency');
  const currency = currencyIdx !== -1 ? args[currencyIdx + 1] : 'SAR';

  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║         RATEHAWK SEARCH API SPEED TEST                       ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);

  // Validate credentials
  if (!KEY_ID || !API_KEY) {
    console.error(`\n${c.red}❌ Missing RateHawk credentials! Set RATEHAWK_KEY_ID and RATEHAWK_API_KEY in .env${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.dim}Key ID: ${KEY_ID}${c.reset}`);
  console.log(`${c.dim}Date: ${new Date().toISOString()}${c.reset}`);
  console.log(`${c.dim}Prebook test: ${testPrebooks ? 'YES' : 'NO (use --prebook to enable)'}${c.reset}`);
  console.log(`${c.dim}Rounds: ${rounds} | Currency: ${currency}${c.reset}`);
  console.log(`${c.dim}Search timeout threshold: ${SEARCH_TIMEOUT_THRESHOLD / 1000}s${c.reset}`);
  console.log(`${c.dim}Prebook timeout threshold: ${PREBOOK_TIMEOUT_THRESHOLD / 1000}s${c.reset}`);

  // Determine which regions to test
  let regionsToTest = Object.entries(TEST_REGIONS);
  if (regionFilter) {
    regionsToTest = regionsToTest.filter(([key]) => regionFilter.includes(key));
    if (regionsToTest.length === 0) {
      console.error(`\n${c.red}❌ No matching regions found. Available: ${Object.keys(TEST_REGIONS).join(', ')}${c.reset}`);
      process.exit(1);
    }
  }

  console.log(`\n${c.bold}Testing ${regionsToTest.length} regions × ${rounds} round(s)${c.reset}`);

  const { checkin, checkout } = getCheckinCheckout(14, 3);
  console.log(`${c.dim}Dates: ${checkin} → ${checkout}${c.reset}`);

  const allSearchResults = [];
  const allPrebookResults = [];

  for (let round = 1; round <= rounds; round++) {
    if (rounds > 1) {
      console.log(`\n${c.bold}${c.blue}━━━ Round ${round}/${rounds} ━━━${c.reset}`);
    }

    for (const [key, region] of regionsToTest) {
      // First, resolve region ID if needed via suggest API
      let regionId = region.id;
      let regionName = region.name;

      // Test search
      const searchResult = await testSearch(regionId, regionName, { checkin, checkout, currency });
      allSearchResults.push(searchResult);

      // Test prebook if enabled
      if (testPrebooks && searchResult.matchHash) {
        // Small delay between search and prebook to avoid rate limit
        await new Promise(r => setTimeout(r, 1000));
        const prebookResult = await testPrebook(searchResult.matchHash, regionName);
        allPrebookResults.push(prebookResult);
      }

      // Small delay between regions to respect rate limits (10 req/60s)
      if (regionsToTest.indexOf([key, region]) < regionsToTest.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // Print summary
  printSummary(allSearchResults, testPrebooks ? allPrebookResults : null);
}

// Run
main().catch(err => {
  console.error(`\n${c.red}Fatal error: ${err.message}${c.reset}`);
  process.exit(1);
});
