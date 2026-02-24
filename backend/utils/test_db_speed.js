/**
 * Quick DB performance test for HotelContent queries
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected!\n');

  const col = mongoose.connection.db.collection('hotelcontents');

  // Get some real hids (skip count - too slow on 4M docs)
  console.log('Fetching sample hids...');
  const sampleDocs = await col.find({}, { projection: { hid: 1 } }).limit(500).toArray();
  const realHids = sampleDocs.map(d => d.hid).filter(Boolean);
  console.log('Got', realHids.length, 'sample hids\n');

  // Test 1: 3 hids
  let start = Date.now();
  let docs = await col.find(
    { hid: { $in: realHids.slice(0, 3) } },
    { projection: { hid: 1, name: 1, mainImage: 1, city: 1 } }
  ).toArray();
  console.log(`3 hids (minimal):     ${Date.now()-start}ms  (found: ${docs.length})`);

  // Test 2: 100 hids
  start = Date.now();
  docs = await col.find(
    { hid: { $in: realHids.slice(0, 100) } },
    { projection: { hid: 1, name: 1, mainImage: 1, city: 1, country: 1, starRating: 1 } }
  ).toArray();
  console.log(`100 hids (minimal):   ${Date.now()-start}ms  (found: ${docs.length})`);

  // Test 3: 400 hids minimal
  start = Date.now();
  docs = await col.find(
    { hid: { $in: realHids.slice(0, 400) } },
    { projection: { hid: 1, name: 1, mainImage: 1, city: 1, country: 1, starRating: 1 } }
  ).toArray();
  console.log(`400 hids (minimal):   ${Date.now()-start}ms  (found: ${docs.length})`);

  // Test 4: 400 hids with ALL enrichment fields
  start = Date.now();
  docs = await col.find(
    { hid: { $in: realHids.slice(0, 400) } },
    { projection: { hid: 1, hotelId: 1, name: 1, nameAr: 1, address: 1, city: 1, country: 1, countryCode: 1, starRating: 1, mainImage: 1, amenities: 1, latitude: 1, longitude: 1, _id: 0 } }
  ).toArray();
  console.log(`400 hids (enrichment): ${Date.now()-start}ms  (found: ${docs.length})`);

  // Test 5: 400 hids NO amenities
  start = Date.now();
  docs = await col.find(
    { hid: { $in: realHids.slice(0, 400) } },
    { projection: { hid: 1, hotelId: 1, name: 1, nameAr: 1, address: 1, city: 1, country: 1, countryCode: 1, starRating: 1, mainImage: 1, latitude: 1, longitude: 1, _id: 0 } }
  ).toArray();
  console.log(`400 hids (no amenities): ${Date.now()-start}ms  (found: ${docs.length})`);

  // Test 6: Check one doc size
  const oneFull = await col.findOne({ hid: realHids[0] });
  const jsonSize = JSON.stringify(oneFull).length;
  const imagesCount = oneFull?.images?.length || 0;
  const amenitiesCount = oneFull?.amenities?.length || 0;
  console.log(`\nSample doc: ${Math.round(jsonSize/1024)}KB, ${imagesCount} images, ${amenitiesCount} amenities`);

  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.stack || e); process.exit(1); });
