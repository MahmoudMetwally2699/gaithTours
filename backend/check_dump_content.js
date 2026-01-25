const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const fzstd = require('fzstd'); // You need this dependency installed
const readline = require('readline');
const ZstdDecompressStream = require('./utils/ZstdDecompressStream');

async function checkDumpFile() {
  const dumpDir = path.join(__dirname, 'data/dumps');
  const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.jsonl.zst'));

  if (files.length === 0) {
    console.log('No dump files found');
    return;
  }

  const filepath = path.join(dumpDir, files[0]);
  console.log(`Checking file: ${filepath}`);

  try {
    const fileStream = fs.createReadStream(filepath);
    const decompressStream = new ZstdDecompressStream();

    const rl = readline.createInterface({
      input: fileStream.pipe(decompressStream),
      crlfDelay: Infinity
    });

    let count = 0;
    console.log('Searching for Makkah Clock Royal Tower (hid: 7821215)... this may take a moment.');

    for await (const line of rl) {
      count++;
      if (count % 10000 === 0) process.stdout.write('.');

      const hotel = JSON.parse(line);
      if (hotel.id === 'fairmont_makkah_clock_royal_tower' || hotel.hid === 7821215) {
        console.log('\n\n--- TARGET HOTEL FOUND IN DUMP ---');
        console.log(`ID: ${hotel.id}`);
        console.log(`Region in dump? ${hotel.region ? 'YES' : 'NO'}`);
        if (hotel.region) console.log(JSON.stringify(hotel.region, null, 2));

        console.log(`PolicyStruct in dump? ${hotel.policy_struct ? 'YES' : 'NO'}`);

        console.log(`MetapolicyStruct in dump? ${hotel.metapolicy_struct ? 'YES' : 'NO'}`);
        return;
      }
    }
    console.log('\nHotel not found in dump');
  } catch (err) {
    console.error('Error reading dump:', err);
  }
}

checkDumpFile();
