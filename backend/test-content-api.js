const axios = require('axios');
require('dotenv').config();

const KEY_ID = process.env.RATEHAWK_KEY_ID;
const API_KEY = process.env.RATEHAWK_API_KEY;

async function testContentAPI() {
    console.log('🧪 Testing RateHawk Content API\n');
    console.log(`Using credentials: KEY_ID=${KEY_ID}\n`);

    // Test with known hotel HIDs from Cairo
    const testHIDs = [11199952, 7475493, 6291688];

    console.log(`Testing with HIDs: ${testHIDs.join(', ')}\n`);

    try {
        const response = await axios.post(
            'https://api.worldota.net/api/content/v1/hotel_content_by_ids/',
            {
                hids: testHIDs,
                language: 'en'
            },
            {
                auth: {
                    username: KEY_ID,
                    password: API_KEY
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ SUCCESS! Content API Response:\n');
        console.log(`Status: ${response.status}`);
        console.log(`Hotels returned: ${response.data.data?.length || 0}\n`);

        if (response.data.data && response.data.data.length > 0) {
            response.data.data.forEach((hotel, index) => {
                console.log(`\n📋 Hotel ${index + 1}:`);
                console.log(`   HID: ${hotel.hid}`);
                console.log(`   Name: ${hotel.name || 'N/A'}`);
                console.log(`   Address: ${hotel.address || 'N/A'}`);
                console.log(`   Star Rating: ${hotel.star_rating || 'N/A'}`);

                // Images
                const imageCount = hotel.images?.length || 0;
                console.log(`   Images: ${imageCount}`);
                if (imageCount > 0) {
                    const sampleUrl = hotel.images[0].url.replace('{size}', '640x400');
                    console.log(`   Sample image: ${sampleUrl}`);
                }

                // Description
                const hasDescription = hotel.description_struct && hotel.description_struct.length > 0;
                console.log(`   Description: ${hasDescription ? 'YES' : 'NO'}`);
                if (hasDescription) {
                    const firstPara = hotel.description_struct[0].paragraphs?.[0];
                    if (firstPara) {
                        console.log(`   Preview: ${firstPara.substring(0, 100)}...`);
                    }
                }

                // Amenities
                let amenityCount = 0;
                if (hotel.amenity_groups) {
                    amenityCount = hotel.amenity_groups.reduce((sum, group) => {
                        return sum + (group.amenities?.length || 0);
                    }, 0);
                }
                console.log(`   Amenities: ${amenityCount}`);
                if (amenityCount > 0 && hotel.amenity_groups[0]?.amenities) {
                    const firstAmenity = hotel.amenity_groups[0].amenities[0];
                    console.log(`   Example: ${firstAmenity.name || firstAmenity}`);
                }
            });

            console.log('\n\n📊 Summary:');
            const withImages = response.data.data.filter(h => h.images && h.images.length > 0).length;
            const withDesc = response.data.data.filter(h => h.description_struct && h.description_struct.length > 0).length;
            const withAmenities = response.data.data.filter(h => h.amenity_groups && h.amenity_groups.length > 0).length;

            console.log(`   Hotels with images: ${withImages}/${response.data.data.length}`);
            console.log(`   Hotels with descriptions: ${withDesc}/${response.data.data.length}`);
            console.log(`   Hotels with amenities: ${withAmenities}/${response.data.data.length}`);

            if (withImages === response.data.data.length) {
                console.log('\n🎉 PERFECT! All hotels have images!');
            } else if (withImages > 0) {
                console.log('\n✅ GOOD! Some hotels have images');
            } else {
                console.log('\n⚠️ WARNING! No hotels have images');
            }
        } else {
            console.log('❌ No hotel data returned');
        }

    } catch (error) {
        console.error('\n❌ ERROR:');
        console.error(`Message: ${error.message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
        }
    }
}

testContentAPI();
