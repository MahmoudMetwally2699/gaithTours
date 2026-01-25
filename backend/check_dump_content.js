const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const fzstd = require('fzstd'); // You need this dependency installed
const readline = require('readline');
const ZstdDecompressStream = require('./utils/ZstdDecompressStream'); // Ensure this path is correct

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

    for await (const line of rl) {
      const hotel = JSON.parse(line);
      console.log('--- FIRST RECORD IN DUMP ---');
      console.log(`ID: ${hotel.id}`);
      console.log(`Region in dump? ${hotel.region ? 'YES' : 'NO'}`);
      if (hotel.region) console.log(JSON.stringify(hotel.region, null, 2));

      console.log(`PolicyStruct in dump? ${hotel.policy_struct ? 'YES' : 'NO'}`);

      console.log(`MetapolicyStruct in dump? ${hotel.metapolicy_struct ? 'YES' : 'NO'}`);
      break; // Only check the first one
    }
  } catch (err) {
    console.error('Error reading dump:', err);
  }
}

checkDumpFile();
