const express = require('express');
require('dotenv').config();

console.log('=== Webhook Configuration Test ===');
console.log('STRIPE_WEBHOOK_SECRET exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('STRIPE_PUBLISHABLE_KEY exists:', !!process.env.STRIPE_PUBLISHABLE_KEY);
console.log('NODE_ENV:', process.env.NODE_ENV);

if (process.env.STRIPE_WEBHOOK_SECRET) {
  console.log('Webhook secret starts with:', process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...');
} else {
  console.log('❌ STRIPE_WEBHOOK_SECRET is not set!');
}

// Test raw body parsing
const app = express();

// Webhook route with raw body
app.use('/webhook', express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  console.log('Raw body type:', typeof req.body);
  console.log('Raw body is Buffer:', Buffer.isBuffer(req.body));
  console.log('Raw body length:', req.body ? req.body.length : 'undefined');
  res.json({ status: 'ok' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test webhook endpoint: http://localhost:${PORT}/webhook`);
});
