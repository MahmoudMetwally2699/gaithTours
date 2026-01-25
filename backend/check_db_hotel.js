const mongoose = require('mongoose');
const HotelContent = require('./models/HotelContent');
require('dotenv').config();

async function checkHotel() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithTours');

  // Makkah Clock Royal Tower
  const hid = 7821215;

  const hotel = await HotelContent.findOne({ hid });

  console.log('--- DB CHECK ---');
  if (!hotel) {
    console.log('Hotel NOT FOUND');
  } else {
    console.log(`Hotel: ${hotel.name}`);
    console.log(`Region: ${JSON.stringify(hotel.region, null, 2)}`);
    // Create a summarized view of metapolicy struct
    const structSummary = hotel.metapolicyStruct ?
      Object.keys(hotel.metapolicyStruct).map(k => `${k}: ${Array.isArray(hotel.metapolicyStruct[k]) ? hotel.metapolicyStruct[k].length + ' items' : 'obj'}`)
      : 'MISSING';

    console.log(`MetapolicyStruct: ${JSON.stringify(structSummary)}`);
    console.log(`PolicyStruct present: ${hotel.policyStruct && hotel.policyStruct.length > 0 ? 'YES (' + hotel.policyStruct.length + ' sections)' : 'NO'}`);
    console.log(`MetapolicyExtraInfo length: ${hotel.metapolicyExtraInfo ? hotel.metapolicyExtraInfo.length : 0}`);
  }

  await mongoose.disconnect();
}

checkHotel().catch(console.error);
