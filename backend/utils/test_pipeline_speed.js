/**
 * RateHawk Search Pipeline Speed Diagnostic
 * ==========================================
 * Tests each phase of YOUR backend's /api/hotels/search endpoint
 * to identify exactly where time is being spent beyond the raw API call.
 *
 * Usage: node utils/test_pipeline_speed.js [destination]
 *   default destination: Jeddah
 *
 * Requires: Backend server running (npm run dev)
 */

const axios = require('axios');

// ─── Configuration ──────────────────────────────────────────────
const BACKEND_URL = 'http://localhost:5001';
const DEFAULT_DESTINATION = process.argv[2] || 'Jeddah';

// ─── Colors ─────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', bold: '\x1b[1m',
  dim: '\x1b[2m', bg: { red: '\x1b[41m', green: '\x1b[42m' }, white: '\x1b[37m'
};

function formatMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms}ms`;
}

function bar(ms, maxMs = 30000) {
  const width = 40;
  const filled = Math.min(width, Math.round((ms / maxMs) * width));
  const filledStr = '█'.repeat(filled);
  const emptyStr = '░'.repeat(width - filled);
  const color = ms < 2000 ? c.green : ms < 10000 ? c.yellow : c.red;
  return `${color}${filledStr}${c.dim}${emptyStr}${c.reset}`;
}

// ─── Get dates ──────────────────────────────────────────────────
function getDates(daysOut = 14, nights = 3) {
  const ci = new Date(); ci.setDate(ci.getDate() + daysOut);
  const co = new Date(ci); co.setDate(co.getDate() + nights);
  const fmt = d => d.toISOString().split('T')[0];
  return { checkin: fmt(ci), checkout: fmt(co) };
}

// ─── Test 1: Direct RateHawk API (raw) ─────────────────────────
async function testDirectApi(destination) {
  console.log(`\n${c.cyan}[Phase 0] Direct RateHawk API (suggest + search)${c.reset}`);

  const keyId = process.env.RATEHAWK_KEY_ID || '13816';
  const apiKey = process.env.RATEHAWK_API_KEY || 'b2d21eb6-42c5-43ec-a5de-6510eb5080a0';
  const baseUrl = 'https://api.worldota.net/api/b2b/v3';
  const { checkin, checkout } = getDates();

  // Suggest
  const suggestStart = Date.now();
  let regionId;
  try {
    const suggestRes = await axios({
      method: 'POST', url: `${baseUrl}/search/multicomplete/`,
      auth: { username: keyId, password: apiKey },
      data: { query: destination, language: 'en' },
      timeout: 10000
    });
    const suggestTime = Date.now() - suggestStart;
    regionId = suggestRes.data?.data?.regions?.[0]?.id;
    console.log(`   Suggest: ${formatMs(suggestTime)} (region_id: ${regionId})`);
  } catch (e) {
    console.log(`   ${c.red}Suggest FAILED: ${e.message}${c.reset}`);
    return null;
  }

  if (!regionId) {
    console.log(`   ${c.red}No region found for "${destination}"${c.reset}`);
    return null;
  }

  // Search
  const searchStart = Date.now();
  try {
    const searchRes = await axios({
      method: 'POST', url: `${baseUrl}/search/serp/region/`,
      auth: { username: keyId, password: apiKey },
      data: {
        region_id: regionId, checkin, checkout,
        residency: 'sa', language: 'en',
        guests: [{ adults: 2, children: [] }],
        currency: 'SAR'
      },
      timeout: 30000
    });
    const searchTime = Date.now() - searchStart;
    const hotels = searchRes.data?.data?.hotels || [];
    console.log(`   Search:  ${formatMs(searchTime)} (${hotels.length} hotels)`);

    return {
      suggestTime: Date.now() - suggestStart - searchTime, // Approximate
      searchTime,
      totalDirect: Date.now() - suggestStart,
      hotelsCount: hotels.length,
      regionId
    };
  } catch (e) {
    console.log(`   ${c.red}Search FAILED: ${e.message}${c.reset}`);
    return null;
  }
}

// ─── Test 2: Your Backend API ───────────────────────────────────
async function testBackendApi(destination) {
  console.log(`\n${c.cyan}[Full Pipeline] Your Backend /api/hotels/search${c.reset}`);

  const { checkin, checkout } = getDates();
  const url = `${BACKEND_URL}/api/hotels/search`;
  const params = {
    destination,
    checkin, checkout,
    adults: 2,
    currency: 'SAR',
    language: 'en',
    limit: 20,
    page: 1
  };

  const start = Date.now();
  try {
    const res = await axios.get(url, { params, timeout: 60000 });
    const elapsed = Date.now() - start;
    const data = res.data?.data || res.data;

    console.log(`   ${c.bold}Total Backend Time: ${formatMs(elapsed)}${c.reset}`);
    console.log(`   Hotels returned: ${data.hotels?.length || 0} of ${data.total || 0}`);
    console.log(`   From cache: ${data.fromCache || false}`);

    return { elapsed, data, success: true };
  } catch (e) {
    const elapsed = Date.now() - start;
    console.log(`   ${c.red}FAILED after ${formatMs(elapsed)}: ${e.message}${c.reset}`);
    return { elapsed, success: false, error: e.message };
  }
}

// ─── Test 3: Second call (should be cached) ─────────────────────
async function testCachedCall(destination) {
  console.log(`\n${c.cyan}[Cached Call] Second request (should be instant)${c.reset}`);

  const { checkin, checkout } = getDates();
  const url = `${BACKEND_URL}/api/hotels/search`;
  const params = {
    destination,
    checkin, checkout,
    adults: 2,
    currency: 'SAR',
    language: 'en',
    limit: 20,
    page: 1
  };

  const start = Date.now();
  try {
    const res = await axios.get(url, { params, timeout: 60000 });
    const elapsed = Date.now() - start;
    const data = res.data?.data || res.data;

    console.log(`   ${c.bold}Cached Time: ${formatMs(elapsed)}${c.reset}`);
    console.log(`   From cache: ${data.fromCache || false}`);

    return { elapsed, fromCache: data.fromCache };
  } catch (e) {
    console.log(`   ${c.red}FAILED: ${e.message}${c.reset}`);
    return { elapsed: Date.now() - start, success: false };
  }
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  const destination = DEFAULT_DESTINATION;

  console.log(`${c.bold}${c.cyan}`);
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║      SEARCH PIPELINE SPEED DIAGNOSTIC                       ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`\n${c.dim}Destination: ${destination}`);
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`Time: ${new Date().toISOString()}${c.reset}`);

  const { checkin, checkout } = getDates();
  console.log(`${c.dim}Dates: ${checkin} → ${checkout}${c.reset}`);

  // ── Step 1: Direct API ──
  const directResult = await testDirectApi(destination);

  // Wait for rate limit window
  console.log(`\n${c.dim}⏳ Waiting 7s for rate limit window...${c.reset}`);
  await new Promise(r => setTimeout(r, 7000));

  // ── Step 2: Backend API (first call) ──
  const backendResult = await testBackendApi(destination);

  // ── Step 3: Backend API (cached call) ──
  await new Promise(r => setTimeout(r, 500));
  const cachedResult = await testCachedCall(destination);

  // ── Summary ──
  console.log(`\n\n${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║                   SPEED COMPARISON                           ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝${c.reset}\n`);

  if (directResult) {
    const overhead = backendResult.success
      ? backendResult.elapsed - directResult.totalDirect
      : 'N/A';
    const overheadPct = backendResult.success
      ? ((overhead / directResult.totalDirect) * 100).toFixed(0)
      : 'N/A';

    const maxTime = Math.max(
      directResult.totalDirect,
      backendResult.elapsed || 0,
      30000
    );

    console.log(`${c.bold}   Phase                         Time         Bar${c.reset}`);
    console.log(`   ${'─'.repeat(60)}`);

    // Direct API
    console.log(`   Direct RateHawk API           ${c.bold}${formatMs(directResult.totalDirect).padEnd(12)}${c.reset} ${bar(directResult.totalDirect, maxTime)}`);

    // Backend
    if (backendResult.success) {
      console.log(`   Your Backend API              ${c.bold}${formatMs(backendResult.elapsed).padEnd(12)}${c.reset} ${bar(backendResult.elapsed, maxTime)}`);
    } else {
      console.log(`   Your Backend API              ${c.red}FAILED${c.reset}`);
    }

    // Cached
    if (cachedResult && cachedResult.elapsed) {
      console.log(`   Backend (cached)              ${c.green}${c.bold}${formatMs(cachedResult.elapsed).padEnd(12)}${c.reset} ${bar(cachedResult.elapsed, maxTime)}`);
    }

    console.log(`   ${'─'.repeat(60)}`);

    if (backendResult.success) {
      const overheadColor = overhead > 5000 ? c.red : overhead > 2000 ? c.yellow : c.green;
      console.log(`\n   ${c.bold}Overhead Analysis:${c.reset}`);
      console.log(`   ├─ Direct API time:     ${formatMs(directResult.totalDirect)}`);
      console.log(`   ├─ Backend total time:  ${formatMs(backendResult.elapsed)}`);
      console.log(`   ├─ ${c.bold}Backend overhead:    ${overheadColor}${formatMs(overhead)} (+${overheadPct}%)${c.reset}`);
      console.log(`   └─ Cached response:     ${c.green}${formatMs(cachedResult?.elapsed || 0)}${c.reset}`);

      console.log(`\n   ${c.bold}Breakdown of overhead (${formatMs(overhead)}):${c.reset}`);
      console.log(`   ${c.dim}These are the phases that add time beyond the raw RateHawk API call:`);
      console.log(`   (Check your terminal running npm run dev for detailed ⏱️ timing logs)${c.reset}`);
      console.log(`   `);
      console.log(`   1. 📝 Arabic Name Resolution (DB lookup)`);
      console.log(`   2. 🔍 Suggest API call (region lookup)`);
      console.log(`   3. 📍 DB Enrichment (HotelContent: images, names, location, amenities)`);
      console.log(`   4. 💰 Margin Calculation (per-hotel margin rule matching)`);
      console.log(`   5. ⭐ Review Enrichment (hotel_reviews collection)`);
      console.log(`   6. 📊 CityStats Count Query`);
      console.log(`   7. 🏷️  TripAdvisor Enrichment (batch exact + fuzzy matching)`);
      console.log(`   `);

      if (overhead > 10000) {
        console.log(`   ${c.bg.red}${c.white} ⚠️  CRITICAL: ${formatMs(overhead)} overhead is very high! ${c.reset}`);
        console.log(`   ${c.red}   Check DB enrichment and TripAdvisor fuzzy matching — likely culprits.${c.reset}`);
      } else if (overhead > 5000) {
        console.log(`   ${c.yellow}⚠️  WARNING: ${formatMs(overhead)} overhead is significant.${c.reset}`);
        console.log(`   ${c.yellow}   Consider parallelizing more DB queries or reducing TripAdvisor enrichment.${c.reset}`);
      } else {
        console.log(`   ${c.green}✅ Overhead is reasonable (${formatMs(overhead)}).${c.reset}`);
        console.log(`   ${c.green}   Most delay is from the RateHawk API itself (${formatMs(directResult.totalDirect)}).${c.reset}`);
      }
    }
  }

  console.log(`\n${c.bold}💡 TIP:${c.reset} Check the server logs in your \`npm run dev\` terminal for detailed`);
  console.log(`   ⏱️  timing breakdowns showing exactly how long each phase takes.\n`);
}

main().catch(err => {
  console.error(`${c.red}Fatal: ${err.message}${c.reset}`);
  process.exit(1);
});
