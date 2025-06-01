const https = require('https');
const crypto = require('crypto');

// Test configuration
const BACKEND_URL = 'https://gaith-tours.vercel.app';
const WEBHOOK_SECRET = 'whsec_T7OYaaLpq4VdTvk2Ql3QaUiD5Gfxtu0S';

console.log('=== Production Webhook Test ===');
console.log('Backend URL:', BACKEND_URL);
console.log('Testing webhook endpoint...\n');

// Test 1: Check if webhook debug endpoint is accessible
async function testWebhookDebug() {
  console.log('🔍 Test 1: Checking webhook debug endpoint...');

  return new Promise((resolve) => {
    const options = {
      hostname: 'gaith-tours.vercel.app',
      path: '/api/payments/webhook-debug',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
          const response = JSON.parse(data);
          console.log('Response:', JSON.stringify(response, null, 2));

          if (response.webhookSecret) {
            console.log('✅ Webhook secret is configured in production');
          } else {
            console.log('❌ Webhook secret is NOT configured in production');
          }
        } catch (e) {
          console.log('Response (raw):', data);
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      console.log('');
      resolve();
    });

    req.end();
  });
}

// Test 2: Simulate a Stripe webhook with proper signature
async function testWebhookSignature() {
  console.log('🔍 Test 2: Testing webhook signature verification...');

  // Create a mock Stripe event
  const mockEvent = {
    id: 'evt_test_webhook',
    object: 'event',
    api_version: '2025-04-30.basil',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'ch_test_charge',
        object: 'charge',
        amount: 5000,
        currency: 'sar',
        status: 'succeeded'
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null
    },
    type: 'charge.updated'
  };

  const payload = JSON.stringify(mockEvent);
  const timestamp = Math.floor(Date.now() / 1000);

  // Create Stripe signature
  const signature = createStripeSignature(payload, timestamp, WEBHOOK_SECRET);

  return new Promise((resolve) => {
    const options = {
      hostname: 'gaith-tours.vercel.app',
      path: '/api/payments/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature,
        'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);

        if (res.statusCode === 200) {
          console.log('✅ Webhook signature verification successful');
        } else {
          console.log('❌ Webhook signature verification failed');
          console.log('This indicates the webhook secret mismatch or raw body parsing issue');
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      console.log('');
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// Test 3: Test with invalid signature
async function testInvalidSignature() {
  console.log('🔍 Test 3: Testing with invalid signature...');

  const mockEvent = {
    id: 'evt_test_invalid',
    object: 'event',
    type: 'charge.updated',
    data: { object: { id: 'ch_test' } }
  };

  const payload = JSON.stringify(mockEvent);

  return new Promise((resolve) => {
    const options = {
      hostname: 'gaith-tours.vercel.app',
      path: '/api/payments/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'invalid_signature',
        'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);

        if (res.statusCode === 400) {
          console.log('✅ Invalid signature properly rejected');
        } else {
          console.log('❌ Invalid signature not properly handled');
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      console.log('');
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// Test 4: Check general API health
async function testAPIHealth() {
  console.log('🔍 Test 4: Checking API health...');

  return new Promise((resolve) => {
    const options = {
      hostname: 'gaith-tours.vercel.app',
      path: '/api/health',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
          const response = JSON.parse(data);
          console.log('Response:', JSON.stringify(response, null, 2));

          if (res.statusCode === 200) {
            console.log('✅ API is healthy');
          } else {
            console.log('❌ API health check failed');
          }
        } catch (e) {
          console.log('Response (raw):', data);
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      console.log('');
      resolve();
    });

    req.end();
  });
}

// Helper function to create Stripe signature
function createStripeSignature(payload, timestamp, secret) {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret.replace('whsec_', ''))
    .update(signedPayload, 'utf8')
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

// Run all tests
async function runTests() {
  console.log('Starting webhook production tests...\n');

  await testAPIHealth();
  await testWebhookDebug();
  await testWebhookSignature();
  await testInvalidSignature();

  console.log('=== Test Results Summary ===');
  console.log('1. Check the webhook debug endpoint response');
  console.log('2. If webhook secret is missing, add it to Vercel environment variables');
  console.log('3. If signature verification fails, check raw body parsing');
  console.log('4. Check Vercel function logs for detailed error messages');
  console.log('\nNext steps:');
  console.log('- Go to Vercel Dashboard → Settings → Environment Variables');
  console.log('- Add STRIPE_WEBHOOK_SECRET = whsec_T7OYaaLpq4VdTvk2Ql3QaUiD5Gfxtu0S');
  console.log('- Redeploy your backend');
}

runTests().catch(console.error);
