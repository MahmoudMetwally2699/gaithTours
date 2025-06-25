const axios = require('axios');
const crypto = require('crypto');

// Test webhook verification (GET request)
async function testWebhookVerification() {
  try {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'test_verify_token';
    const challenge = 'test_challenge_123';

    const response = await axios.get('http://localhost:5000/webhook/whatsapp', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': challenge
      }
    });

    console.log('✅ Webhook verification test passed');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Webhook verification test failed:', error.message);
    return false;
  }
}

// Test webhook message receiving (POST request)
async function testWebhookMessage() {
  try {
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || 'test_webhook_secret';

    // Sample WhatsApp webhook payload
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '1234567890',
                  phone_number_id: 'PHONE_NUMBER_ID'
                },
                contacts: [
                  {
                    profile: {
                      name: 'Test User'
                    },
                    wa_id: '1234567890'
                  }
                ],
                messages: [
                  {
                    from: '1234567890',
                    id: 'wamid.test123',
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: {
                      body: 'Hello, this is a test message!'
                    },
                    type: 'text'
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };

    const payloadString = JSON.stringify(payload);

    // Generate signature
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString, 'utf8')
      .digest('hex');

    const response = await axios.post('http://localhost:5000/webhook/whatsapp', payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${signature}`
      }
    });

    console.log('✅ Webhook message test passed');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Webhook message test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Test admin API endpoints
async function testAdminAPI() {
  try {
    // Test getting conversations
    const token = process.env.ADMIN_TOKEN; // You'll need to set this with a valid admin token

    if (!token) {
      console.log('⚠️ Admin API test skipped - no ADMIN_TOKEN provided');
      return true;
    }

    const response = await axios.get('http://localhost:5000/api/admin/whatsapp/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Admin API test passed');
    console.log('Conversations found:', response.data.conversations.length);
    return true;
  } catch (error) {
    console.error('❌ Admin API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting WhatsApp webhook tests...\n');

  console.log('1. Testing webhook verification...');
  const verificationPassed = await testWebhookVerification();

  console.log('\n2. Testing webhook message receiving...');
  const messagePassed = await testWebhookMessage();

  console.log('\n3. Testing admin API...');
  const apiPassed = await testAdminAPI();

  console.log('\n📊 Test Results:');
  console.log(`Webhook Verification: ${verificationPassed ? '✅' : '❌'}`);
  console.log(`Webhook Message: ${messagePassed ? '✅' : '❌'}`);
  console.log(`Admin API: ${apiPassed ? '✅' : '❌'}`);

  const allPassed = verificationPassed && messagePassed && apiPassed;
  console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);

  if (!allPassed) {
    console.log('\n💡 Make sure:');
    console.log('- Your backend server is running on http://localhost:5000');
    console.log('- Environment variables are set correctly');
    console.log('- Database is connected and models are created');
    console.log('- Admin token is valid (for API tests)');
  }
}

// Environment setup instructions
function showSetupInstructions() {
  console.log('🔧 Setup Instructions:');
  console.log('');
  console.log('1. Set environment variables:');
  console.log('   export WHATSAPP_VERIFY_TOKEN="your_verify_token"');
  console.log('   export WHATSAPP_WEBHOOK_SECRET="your_webhook_secret"');
  console.log('   export ADMIN_TOKEN="your_admin_jwt_token"  # Optional for API tests');
  console.log('');
  console.log('2. Start your backend server:');
  console.log('   cd backend && npm start');
  console.log('');
  console.log('3. Run this test:');
  console.log('   node test-whatsapp-webhook.js');
  console.log('');
}

// Check if environment variables are set
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showSetupInstructions();
  process.exit(0);
}

if (!process.env.WHATSAPP_VERIFY_TOKEN || !process.env.WHATSAPP_WEBHOOK_SECRET) {
  console.log('⚠️ Missing environment variables!');
  showSetupInstructions();
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);
