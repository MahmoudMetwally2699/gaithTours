/**
 * ETG Hotel Dump Processor
 *
 * This utility downloads, decompresses, and imports hotel data from ETG dumps
 * into the local MongoDB database. This eliminates Content API calls during search.
 *
 * ETG Certification Issue #3: Search Workflow
 *
 * Usage:
 *   node dumpProcessor.js --download   # Download latest dump
 *   node dumpProcessor.js --import     # Import downloaded dump
 *   node dumpProcessor.js --all        # Download and import
 *
 * Requirements:
 *   - ETG API credentials with dump access
 *   - Sufficient disk space for decompressed data
 *   - MongoDB connection
 */

const fs = require('fs');
const path = require('path');
// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const zlib = require('zlib');
const fzstd = require('fzstd'); // For Zstandard decompression
const readline = require('readline');
const axios = require('axios');
const HotelContent = require('../models/HotelContent');
const ZstdDecompressStream = require('./ZstdDecompressStream');

// Configuration
const CONFIG = {
  // V3 Dump endpoints
  dumpUrl: 'https://api.worldota.net/api/b2b/v3/hotel/info/dump/',
  incrementalDumpUrl: 'https://api.worldota.net/api/b2b/v3/hotel/info/incremental_dump/',
  downloadDir: path.join(__dirname, '../data/dumps'),
  batchSize: 1000, // Hotels per batch for import
  keyId: process.env.RATEHAWK_KEY_ID,
  apiKey: process.env.RATEHAWK_API_KEY
};

class DumpProcessor {
  constructor() {
    this.stats = {
      downloaded: 0,
      imported: 0,
      errors: 0,
      startTime: null
    };
  }

  /**
   * Get the download URL for the hotel dump
   */
  async getDumpUrl(language = 'en') {
    console.log('📥 Requesting full dump URL from ETG...');

    const response = await axios.post(
      CONFIG.dumpUrl,
      { language },
      {
        auth: {
          username: CONFIG.keyId,
          password: CONFIG.apiKey
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data?.data?.url) {
      throw new Error('Failed to get dump URL from ETG API');
    }

    return response.data.data.url;
  }

  /**
   * Get the download URL for the incremental hotel dump (changes from previous day)
   */
  async getIncrementalDumpUrl(language = 'en') {
    console.log('📥 Requesting incremental dump URL from ETG...');

    const response = await axios.post(
      CONFIG.incrementalDumpUrl,
      { language, inventory: 'all' },
      {
        auth: {
          username: CONFIG.keyId,
          password: CONFIG.apiKey
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data?.data?.url) {
      throw new Error('Failed to get incremental dump URL from ETG API');
    }

    console.log(`   Last update: ${response.data.data.last_update}`);
    return response.data.data.url;
  }

  /**
   * Download the dump file
   */
  async downloadDump(url, type = 'full') {
    console.log('⬇️  Downloading dump file...');
    console.log(`   URL: ${url}`);

    // Ensure download directory exists
    if (!fs.existsSync(CONFIG.downloadDir)) {
      fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    }

    const prefix = type === 'incremental' ? 'hotel_incremental_dump' : 'hotel_dump';
    const filename = `${prefix}_${new Date().toISOString().split('T')[0]}.jsonl.zst`;
    const filepath = path.join(CONFIG.downloadDir, filename);

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Downloaded: ${filepath}`);
        resolve(filepath);
      });
      writer.on('error', reject);
    });
  }

  /**
   * Process a single hotel record from the dump
   */
  transformHotelData(rawHotel) {
    // Extract images
    const images = [];
    if (rawHotel.images_ext) {
      rawHotel.images_ext.forEach(img => {
        if (img.url) {
          images.push({
            url: img.url,
            category: img.category || 'general'
          });
        }
      });
    }

    // Extract flat amenities list
    const amenities = [];
    const amenityGroups = [];
    if (rawHotel.amenity_groups) {
      rawHotel.amenity_groups.forEach(group => {
        const groupAmenities = [];
        if (group.amenities) {
          group.amenities.forEach(amenity => {
            const name = typeof amenity === 'string' ? amenity : amenity.name;
            if (name) {
              amenities.push(name);
              groupAmenities.push(name);
            }
          });
        }
        amenityGroups.push({
          groupName: group.group_name || 'General',
          amenities: groupAmenities
        });
      });
    }

    // Extract room groups
    const roomGroups = [];
    if (rawHotel.room_groups) {
      rawHotel.room_groups.forEach(room => {
        const roomImages = [];

        // Handle images_ext (objects with url property) - preferred format
        if (room.images_ext && room.images_ext.length > 0) {
          room.images_ext.forEach(img => {
            if (img.url) roomImages.push({ url: img.url });
          });
        }
        // Fallback to images (simple string array of URLs)
        else if (room.images && room.images.length > 0) {
          room.images.forEach(imgUrl => {
            if (typeof imgUrl === 'string') {
              roomImages.push({ url: imgUrl });
            }
          });
        }

        roomGroups.push({
          name: room.name || room.rg_ext?.name,
          images: roomImages,
          roomAmenities: room.room_amenities || room.rg_ext?.room_amenities || [],
          bedGroups: room.bed_groups || []
        });
      });
    }

    const city = rawHotel.region?.name || '';
    const name = rawHotel.name || '';
    const address = rawHotel.address || '';
    const country = rawHotel.region?.country_name || '';

    // Generate cityNormalized and searchText here because
    // Mongoose pre('save') hooks do NOT run on bulkWrite/updateOne
    const cityNormalized = city ? city.toLowerCase().trim() : undefined;
    const searchText = [name, address, city, country, amenities.join(' ')].filter(Boolean).join(' ');

    return {
      hid: rawHotel.hid,
      hotelId: rawHotel.id,
      name: name,
      address: address,
      city: city || undefined,
      cityNormalized: cityNormalized,
      searchText: searchText,
      country: country || undefined,
      countryCode: rawHotel.region?.country_code,
      // Full region object for detailed location display
      region: rawHotel.region ? {
        country_code: rawHotel.region.country_code,
        iata: rawHotel.region.iata,
        id: rawHotel.region.id,
        name: rawHotel.region.name,
        type: rawHotel.region.type
      } : null,
      latitude: rawHotel.latitude,
      longitude: rawHotel.longitude,
      starRating: rawHotel.star_rating,
      images: images,
      mainImage: images[0]?.url?.replace('{size}', '640x400') || null,
      description: rawHotel.description_struct?.[0]?.paragraphs?.join('\n\n') || '',
      descriptionStruct: rawHotel.description_struct,
      amenityGroups: amenityGroups,
      amenities: amenities,
      roomGroups: roomGroups,
      checkInTime: rawHotel.check_in_time,
      checkOutTime: rawHotel.check_out_time,
      metapolicyExtraInfo: rawHotel.metapolicy_extra_info,
      metapolicyStruct: rawHotel.metapolicy_struct,
      policyStruct: rawHotel.policy_struct,
      facts: rawHotel.facts,
      dumpDate: new Date(),
      lastUpdated: new Date()
    };
  }

  /**
   * Import hotels from a zstd-compressed dump file.
   * Uses the system `zstd` CLI for streaming decompression (low memory),
   * falls back to JS-based fzstd if zstd CLI is not available.
   */
  async importDump(filepath) {
    console.log('📦 Importing dump file...');
    console.log(`   File: ${filepath}`);

    this.stats.startTime = Date.now();

    let inputStream;

    // Try to use system zstd command (much lower memory usage)
    try {
      const { execSync } = require('child_process');
      execSync('zstd --version', { stdio: 'ignore' });

      // zstd CLI is available — use it for streaming decompression
      console.log('   Using system zstd for decompression (memory-efficient)');
      const { spawn } = require('child_process');
      const zstdProcess = spawn('zstd', ['-d', '-c', filepath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      zstdProcess.stderr.on('data', (data) => {
        console.error(`   zstd stderr: ${data.toString().trim()}`);
      });

      inputStream = zstdProcess.stdout;
    } catch (e) {
      // zstd CLI not available, fall back to JS library
      console.log('   zstd CLI not found, using JS decompressor (higher memory)');
      const fileStream = fs.createReadStream(filepath);
      const decompressStream = new ZstdDecompressStream();
      inputStream = fileStream.pipe(decompressStream);
    }

    const rl = readline.createInterface({
      input: inputStream,
      crlfDelay: Infinity
    });

    let batch = [];
    let lineCount = 0;

    for await (const line of rl) {
      lineCount++;

      try {
        const hotel = JSON.parse(line);

        const transformed = this.transformHotelData(hotel);
        batch.push(transformed);

        if (batch.length >= CONFIG.batchSize) {
          await this.processBatch(batch);
          batch = [];
        }
      } catch (err) {
        this.stats.errors++;
        if (this.stats.errors <= 10) {
          console.error(`   ⚠️ Error on line ${lineCount}: ${err.message}`);
        }
      }

      // Progress update
      if (lineCount % 10000 === 0) {
        console.log(`   📊 Processed ${lineCount} hotels...`);
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      await this.processBatch(batch);
    }

    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    console.log('\n✅ Import complete!');
    console.log(`   Hotels imported: ${this.stats.imported}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Time: ${elapsed.toFixed(2)}s`);
  }

  /**
   * Process a batch of hotels
   */
  async processBatch(hotels) {
    try {
      const result = await HotelContent.bulkUpsertFromDump(hotels);
      this.stats.imported += result.upsertedCount + result.modifiedCount;
    } catch (err) {
      console.error(`   ❌ Batch error: ${err.message}`);
      this.stats.errors += hotels.length;
    }
  }

  /**
   * Run the full download and import process
   */
  async run(options = {}) {
    const { download = false, import: doImport = false, incremental = false } = options;

    try {
      let filepath;

      if (incremental) {
        // Incremental mode: download and import daily changes
        console.log('\n🔄 Running INCREMENTAL dump (daily changes only)...');
        const url = await this.getIncrementalDumpUrl();
        filepath = await this.downloadDump(url, 'incremental');
        await this.importDump(filepath);
      } else {
        if (download) {
          const url = await this.getDumpUrl();
          filepath = await this.downloadDump(url);
        }

        if (doImport) {
          if (!filepath) {
            // Find the most recent dump file
            const files = fs.readdirSync(CONFIG.downloadDir)
              .filter(f => f.endsWith('.jsonl.zst'))
              .sort()
              .reverse();

            if (files.length === 0) {
              throw new Error('No dump files found. Run with --download first.');
            }

            filepath = path.join(CONFIG.downloadDir, files[0]);
          }

          await this.importDump(filepath);
        }
      }

      console.log('\n🎉 Done!');
    } catch (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  }
}

// CLI handler
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    download: args.includes('--download') || args.includes('--all'),
    import: args.includes('--import') || args.includes('--all'),
    incremental: args.includes('--incremental')
  };

  if (!options.download && !options.import && !options.incremental) {
    console.log('Usage: node dumpProcessor.js [options]');
    console.log('  --download      Download the latest full hotel dump');
    console.log('  --import        Import the downloaded dump to MongoDB');
    console.log('  --all           Download and import full dump');
    console.log('  --incremental   Download and import incremental dump (daily changes only)');
    process.exit(0);
  }

  // Connect to MongoDB
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithTours')
    .then(() => {
      console.log('📦 Connected to MongoDB');
      const processor = new DumpProcessor();
      return processor.run(options);
    })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Failed:', err);
      process.exit(1);
    });
}

module.exports = DumpProcessor;
