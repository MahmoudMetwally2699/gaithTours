const axios = require('axios');

// WhatsApp Business API Registration Test
const WHATSAPP_PHONE_NUMBER_ID = '703983149463496';
const WHATSAPP_ACCESS_TOKEN = 'EAAPnCPzlYAoBO3bTa19y1UkBVIG5iTrlgxYra87nQCNZBIi6u4ydKKidwIJx4ndH1ZBr2VWXSYMbtWSmiI453PUNLlLgvlANeGFcVs4dqK9DtZAIpdNFZB079ob2sv898GZBfNQuxdbRAHkDvdk1YAdPU37iY4Dsv2naNBjj8VkvvudEi2Mgy5FM1rVAjGmcFZCgZDZD'; // Replace with your actual token

/**
 * Test the WhatsApp Business Account Registration API
 * This endpoint is used to register a phone number with WhatsApp Business API
 */
async function testWhatsAppRegistration() {
  try {
    console.log('🧪 Testing WhatsApp Business Account Registration API...');
    console.log(`📞 Phone Number ID: ${WHATSAPP_PHONE_NUMBER_ID}`);
    console.log(`🔑 Access Token: ${WHATSAPP_ACCESS_TOKEN.substring(0, 20)}...`);    // Registration endpoint URL - using the register endpoint as in curl example
    const url = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/register`;

    console.log('\n📤 Making registration request...');
    console.log('URL:', url);

    // Using the PIN 644252 as specified
    const payload = {
      messaging_product: "whatsapp",
      pin: "644252"
    };

    const headers = {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Headers:', headers);

    const response = await axios.post(url, payload, { headers });

    console.log('\n✅ SUCCESS!');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('\n❌ REGISTRATION FAILED!');
    console.log('Error Status:', error.response?.status);
    console.log('Error Message:', error.message);

    if (error.response?.data) {
      console.log('Error Details:', JSON.stringify(error.response.data, null, 2));

      // Analyze the error
      if (error.response.data.error) {
        const errorInfo = error.response.data.error;
        console.log('\n🔍 Error Analysis:');
        console.log('- Error Type:', errorInfo.type);
        console.log('- Error Code:', errorInfo.code);
        console.log('- Error Message:', errorInfo.message);

        // Provide specific guidance based on error
        switch (errorInfo.code) {
          case 133010:
            console.log('\n💡 Account Not Registered:');
            console.log('This means you need to complete the initial setup in Meta Developer Console.');
            break;
          case 131047:
            console.log('\n💡 Invalid PIN:');
            console.log('The 6-digit PIN is incorrect. Check the SMS from Meta.');
            break;
          case 131053:
            console.log('\n💡 PIN Expired:');
            console.log('The PIN has expired. Request a new one.');
            break;
          default:
            console.log('\n💡 General Error:');
            console.log('Check Meta Developer Console for more details.');
        }
      }
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Go to https://developers.facebook.com/');
    console.log('2. Find your app and go to WhatsApp > Getting Started');
    console.log('3. Follow the phone number verification process');
    console.log('4. Meta will send a 6-digit PIN to your business phone');
    console.log('5. Update the PIN in this script and run again');
  }
}

/**
 * Test account info endpoint to check current status
 */
async function testAccountInfo() {
  try {
    console.log('\n🔍 Checking account information...');

    const url = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}`;

    const headers = {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    };

    const response = await axios.get(url, { headers });

    console.log('\n✅ Account Info Retrieved!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('\n❌ Failed to get account info');
    console.log('Error:', error.response?.data || error.message);
  }
}

/**
 * Test the curl command equivalent
 */
function showCurlEquivalent() {
  console.log('\n📋 Equivalent cURL command:');
  console.log('============================');
  console.log(`curl 'https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/register' \\`);
  console.log(`  -H 'Content-Type: application/json' \\`);
  console.log(`  -H 'Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}' \\`);
  console.log(`  -d '{`);
  console.log(`    "messaging_product": "whatsapp",`);
  console.log(`    "pin": "644252"`);
  console.log(`  }'`);
  console.log('\nThis matches the curl command structure you provided.');
}

// Main execution
async function main() {
  console.log('🚀 WhatsApp Business Registration Test');
  console.log('=====================================\n');

  // Show the curl equivalent first
  showCurlEquivalent();

  // Check current account status
  await testAccountInfo();

  // Attempt registration (will likely fail without correct PIN)
  console.log('\n' + '='.repeat(50));
  await testWhatsAppRegistration();
  console.log('\n✨ Test completed!');
  console.log('\n⚠️  IMPORTANT: Make sure to replace the access token with your actual token');
  console.log('   The PIN 644252 is already configured as requested.');
}

// Run the test
main().catch(console.error);
