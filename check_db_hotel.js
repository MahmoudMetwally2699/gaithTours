const mongoose = require('mongoose');
const HotelContent = require('./backend/models/HotelContent');
require('dotenv').config({ path: './backend/.env' });

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
    console.log(`MetapolicyStruct keys: ${hotel.metapolicyStruct ? Object.keys(hotel.metapolicyStruct).join(', ') : 'MISSING'}`);
    console.log(`PolicyStruct present: ${hotel.policyStruct && hotel.policyStruct.length > 0 ? 'YES' : 'NO'}`);
    console.log(`MetapolicyExtraInfo length: ${hotel.metapolicyExtraInfo ? hotel.metapolicyExtraInfo.length : 0}`);
  }

  await mongoose.disconnect();
}

checkHotel().catch(console.error);
