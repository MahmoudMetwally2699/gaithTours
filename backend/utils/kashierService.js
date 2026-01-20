/**
 * Kashier.io Payment Service
 *
 * Handles payment session creation, status checking, and webhook verification
 * for the Kashier payment gateway.
 *
 * API Documentation: https://developers.kashier.io/payment/payment-sessions
 */

const axios = require('axios');
const crypto = require('crypto');
const https = require('https');

// Kashier API configuration
// Note: Per Kashier docs, session creation uses api.kashier.io,
// while session status check uses test-api.kashier.io for test mode
const KASHIER_CONFIG = {
  // Session creation always uses api.kashier.io
  sessionApiUrl: 'https://api.kashier.io',
  // Status check uses test-api for test mode
  testApiUrl: 'https://test-api.kashier.io',
  productionApiUrl: 'https://api.kashier.io',
  paymentUrl: 'https://payments.kashier.io'
};

/**
 * Get the appropriate API base URL based on test mode and operation type
 */
const getApiBaseUrl = (isForSessionCreation = false) => {
  const isTestMode = process.env.KASHIER_TEST_MODE === 'true';
  // Both session creation AND status check use test-api in test mode
  return isTestMode ? KASHIER_CONFIG.testApiUrl : KASHIER_CONFIG.productionApiUrl;
};

/**
 * Create Kashier API client with authentication headers
 * @param {boolean} isForSessionCreation - Whether this is for session creation (uses main API URL)
 */
const createKashierClient = (isForSessionCreation = false) => {
  const apiKey = process.env.KASHIER_API_KEY;
  const secretKey = process.env.KASHIER_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Kashier API credentials not configured. Set KASHIER_API_KEY and KASHIER_SECRET_KEY in environment.');
  }

  // Manually strip quotes if they exist (handling potential dotenv parsing issues)
  const cleanApiKey = String(apiKey).trim().replace(/^['"]|['"]$/g, '');
  const cleanSecretKey = String(secretKey).trim().replace(/^['"]|['"]$/g, '');

  const baseURL = getApiBaseUrl(isForSessionCreation);

  // Debug logging for credentials (masked)
  console.log('🔐 Kashier Credentials (Cleaned):');
  console.log('   API Key:', cleanApiKey ? `${cleanApiKey.substring(0, 8)}...` : 'NOT SET');
  console.log('   Secret Key:', cleanSecretKey ? `${cleanSecretKey.substring(0, 15)}...` : 'NOT SET');
  console.log('🌐 Kashier API URL:', baseURL);

  const client = axios.create({
    baseURL,
    headers: {
      'Authorization': cleanSecretKey,
      'api-key': cleanApiKey,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  // Add request interceptor for debugging
  client.interceptors.request.use(request => {
    console.log('📤 Sending Kashier Request:', {
      url: request.baseURL + request.url,
      method: request.method,
      headers: {
        ...request.headers,
        'Authorization': '[MASKED]',
        'api-key': request.headers['api-key'] ? `${request.headers['api-key'].substring(0, 5)}...` : 'MISSING'
      }
    });
    return request;
  });

  return client;
};

/**
 * Create a payment session for hotel booking
 *
 * @param {Object} options - Payment session options
 * @param {string} options.orderId - Unique order/booking ID
 * @param {number} options.amount - Payment amount
 * @param {string} options.currency - Currency code (e.g., 'SAR', 'EGP', 'USD')
 * @param {string} options.customerEmail - Customer email address
 * @param {string} options.customerReference - Customer reference ID
 * @param {Object} options.metadata - Additional booking metadata
 * @param {string} options.description - Payment description
 * @returns {Promise<Object>} Payment session response with sessionUrl
 */
const createPaymentSession = async (options) => {
  const {
    orderId,
    amount,
    currency = process.env.KASHIER_CURRENCY || 'EGP',
    customerEmail,
    customerReference,
    customerName, // Added customerName
    metadata = {},
    description = 'Hotel Booking Payment'
  } = options;

  // Validate required fields
  if (!orderId || !amount || !customerEmail) {
    throw new Error('Missing required fields: orderId, amount, customerEmail');
  }

  const merchantId = process.env.KASHIER_MERCHANT_ID;
  if (!merchantId) {
    throw new Error('KASHIER_MERCHANT_ID not configured');
  }

  // Build redirect URLs
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';

  // Session expires in 30 minutes
  const expireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Validate and normalize currency code (should be a 3-letter ISO code like EGP, SAR, USD)
  const normalizedCurrency = String(currency).toUpperCase().trim();
  const validCurrencies = ['EGP', 'SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'QAR', 'BHD', 'OMR'];

  // In test mode, optionally force a specific currency (e.g., EGP)
  const isTestMode = process.env.KASHIER_TEST_MODE === 'true';
  const forceTestCurrency = process.env.KASHIER_FORCE_TEST_CURRENCY; // e.g., 'EGP' or empty to disable
  let finalCurrency = normalizedCurrency;

  if (isTestMode && forceTestCurrency && normalizedCurrency !== forceTestCurrency.toUpperCase()) {
    console.warn(`⚠️ Test mode: Converting ${normalizedCurrency} to ${forceTestCurrency.toUpperCase()} (set KASHIER_FORCE_TEST_CURRENCY='' to disable)`);
    finalCurrency = forceTestCurrency.toUpperCase();
  } else if (!validCurrencies.includes(normalizedCurrency)) {
    console.warn(`⚠️ Currency '${normalizedCurrency}' might not be supported. Using EGP as fallback.`);
    finalCurrency = 'EGP';
  }

  const sessionPayload = {
    expireAt,
    maxFailureAttempts: 3,
    paymentType: 'credit',
    amount: amount.toFixed(2),
    currency: finalCurrency,
    order: orderId,
    merchantRedirect: `${frontendUrl}/booking/payment-callback?orderId=${orderId}`,
    display: 'en',
    type: 'one-time',
    allowedMethods: 'card,wallet',
    merchantId,
    failureRedirect: false,
    brandColor: '#E67915', // Gaith Tours orange
    defaultMethod: 'card',
    description,
    manualCapture: false,
    customer: {
      name: customerName, // Add customer name
      email: customerEmail,
      reference: (customerReference || orderId).replace(/[^a-zA-Z0-9]/g, '') // Alphanumeric only
    },
    saveCard: 'optional',
    retrieveSavedCard: true,
    interactionSource: 'ECOMMERCE',
    enable3DS: true,
    serverWebhook: `${backendUrl}/api/payments/kashier/webhook`,
    metaData: {
      ...metadata,
      source: 'gaith_tours',
      orderId
    }
  };

  console.log('📦 Creating Kashier payment session...');
  console.log('   Order ID:', orderId);
  console.log('   Amount:', amount, finalCurrency);
  console.log('   Payload:', JSON.stringify(sessionPayload, null, 2));

  // Use native https module to avoid Axios weirdness with headers
  return new Promise((resolve, reject) => {
    try {
      const urlStr = `${getApiBaseUrl(true)}/v3/payment/sessions`;
      const url = new URL(urlStr);

      // Manually strip quotes if they exist
      const cleanApiKey = String(process.env.KASHIER_API_KEY).trim().replace(/^['"]|['"]$/g, '');
      const cleanSecretKey = String(process.env.KASHIER_SECRET_KEY).trim().replace(/^['"]|['"]$/g, '');

      console.log('📤 Sending Direct Kashier Request (Native HTTPS) to:', urlStr);
      console.log('🔑 API Key (first 10 chars):', cleanApiKey.substring(0, 10));
      console.log('🔑 Secret Key (first 15 chars):', cleanSecretKey.substring(0, 15));
      console.log('🔑 API Key Length:', cleanApiKey.length);
      console.log('🔑 Secret Key Length:', cleanSecretKey.length);

      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Authorization': cleanSecretKey,
          'api-key': cleanApiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(sessionPayload))
        }
      };

      console.log('📋 Request Headers:', JSON.stringify({
        'Authorization': cleanSecretKey.substring(0, 20) + '...',
        'api-key': cleanApiKey,
        'Content-Type': 'application/json'
      }, null, 2));

      const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          try {
            const data = JSON.parse(responseBody);

            if (res.statusCode >= 200 && res.statusCode < 300 && data && data._id) {
               const isTestMode = process.env.KASHIER_TEST_MODE === 'true';
               const sessionUrl = data.sessionUrl ||
                 `https://payments.kashier.io/session/${data._id}${isTestMode ? '?mode=test' : ''}`;

               console.log('✅ Kashier session created:', data._id);
               resolve({
                  success: true,
                  sessionId: data._id,
                  sessionUrl,
                  status: data.status,
                  expireAt: data.expireAt
               });
            } else {
               // Log the failure details
               console.error('❌ Kashier Request Failed:', res.statusCode);
               console.error('   Response Body:', responseBody);
               reject(new Error(data.message || (data.messages ? JSON.stringify(data.messages) : 'Unknown Kashier Error')));
            }
          } catch (e) {
            console.error('❌ Failed to parse response:', responseBody);
            reject(new Error('Invalid JSON response from Kashier API'));
          }
        });
      });

      req.on('error', (e) => {
        console.error('❌ Network Error:', e);
        reject(e);
      });

      req.write(JSON.stringify(sessionPayload));
      req.end();

    } catch (error) {
       reject(error);
    }
  });
};

/**
 * Get payment session status
 *
 * @param {string} sessionId - Kashier session ID
 * @returns {Promise<Object>} Payment status response
 */
const getPaymentStatus = async (sessionId) => {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  console.log('🔍 Checking Kashier payment status:', sessionId);

  try {
    const client = createKashierClient();
    const response = await client.get(`/v3/payment/sessions/${sessionId}/payment`);

    if (response.data && response.data.data) {
      const paymentData = response.data.data;

      console.log('   Status:', paymentData.status);

      return {
        success: true,
        sessionId: paymentData.sessionId,
        status: paymentData.status,
        amount: paymentData.amount,
        currency: paymentData.currency,
        method: paymentData.method,
        merchantOrderId: paymentData.merchantOrderId,
        orderId: paymentData.orderId,
        customer: paymentData.customer,
        metaData: paymentData.metaData,
        createdAt: paymentData.createdAt,
        updatedAt: paymentData.updatedAt,
        history: paymentData.history
      };
    }

    return {
      success: false,
      status: 'UNKNOWN',
      message: 'Could not retrieve payment status'
    };

  } catch (error) {
    console.error('❌ Kashier status check failed:', error.response?.data || error.message);

    // If session not found, return appropriate status
    if (error.response?.status === 404) {
      return {
        success: false,
        status: 'NOT_FOUND',
        message: 'Payment session not found'
      };
    }

    throw new Error(`Failed to get payment status: ${error.message}`);
  }
};

/**
 * Verify webhook signature from Kashier
 * Note: Implement based on Kashier's webhook signature format
 *
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature from headers
 * @returns {boolean} Whether signature is valid
 */
const verifyWebhookSignature = (payload, signature) => {
  const secretKey = process.env.KASHIER_SECRET_KEY;

  if (!secretKey || !signature) {
    console.warn('⚠️ Missing secret key or signature for webhook verification');
    return false;
  }

  try {
    // Kashier typically uses HMAC-SHA256 for webhook signatures
    // The exact implementation may vary - check Kashier documentation
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payloadString)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('❌ Webhook signature verification error:', error.message);
    return false;
  }
};

/**
 * Process successful payment and trigger booking
 *
 * @param {Object} webhookData - Webhook payload data
 * @returns {Promise<Object>} Processing result
 */
const processSuccessfulPayment = async (webhookData) => {
  const { sessionId, orderId, amount, currency, customer, metaData } = webhookData;

  console.log('💰 Processing successful Kashier payment');
  console.log('   Session ID:', sessionId);
  console.log('   Order ID:', orderId);
  console.log('   Amount:', amount, currency);

  // The actual booking creation will be handled in the route
  // This function is for any Kashier-specific post-processing

  return {
    success: true,
    sessionId,
    orderId: metaData?.orderId || orderId,
    amount,
    currency,
    customerEmail: customer?.email,
    processedAt: new Date().toISOString()
  };
};

/**
 * Check if payment session is successful
 *
 * @param {string} status - Payment status from Kashier
 * @returns {boolean} Whether payment is successful
 */
const isPaymentSuccessful = (status) => {
  const successStatuses = ['SUCCESS', 'CAPTURED', 'PAID', 'COMPLETED'];
  return successStatuses.includes(status?.toUpperCase());
};

/**
 * Check if payment session is pending
 *
 * @param {string} status - Payment status from Kashier
 * @returns {boolean} Whether payment is pending
 */
const isPaymentPending = (status) => {
  const pendingStatuses = ['PENDING', 'CREATED', 'OPENED', 'PROCESSING'];
  return pendingStatuses.includes(status?.toUpperCase());
};

/**
 * Check if payment session has failed
 *
 * @param {string} status - Payment status from Kashier
 * @returns {boolean} Whether payment has failed
 */
const isPaymentFailed = (status) => {
  const failedStatuses = ['FAILED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'ERROR'];
  return failedStatuses.includes(status?.toUpperCase());
};

/**
 * Process a full refund for a completed payment
 *
 * @param {string} kashierOrderId - Kashier order ID
 * @param {number} amount - Amount to refund (for full refund, pass the original amount)
 * @param {string} reason - Reason for refund
 * @returns {Promise<Object>} Refund result
 */
const processRefund = async (kashierOrderId, amount, reason = 'Customer cancellation') => {
  if (!kashierOrderId) {
    throw new Error('Kashier Order ID is required for refund');
  }

  if (!amount || amount <= 0) {
    throw new Error('Valid refund amount is required');
  }

  console.log('💸 Processing Kashier refund...');
  console.log('   Order ID:', kashierOrderId);
  console.log('   Amount:', amount);
  console.log('   Reason:', reason);

  try {
    const secretKey = process.env.KASHIER_SECRET_KEY;
    if (!secretKey) {
      throw new Error('KASHIER_SECRET_KEY not configured');
    }

    // Manually strip quotes if they exist
    const cleanSecretKey = String(secretKey).trim().replace(/^['"]"|['"]$/g, '');

    // Use test or production FEP endpoint based on mode
    const isTestMode = process.env.KASHIER_TEST_MODE === 'true';
    const fepUrl = isTestMode
      ? 'https://test-fep.kashier.io/v3/orders'
      : 'https://fep.kashier.io/v3/orders';

    const refundPayload = {
      apiOperation: 'REFUND',
      reason: reason,
      transaction: {
        amount: parseFloat(amount).toFixed(2)
      }
    };

    console.log('📤 Sending refund request to:', `${fepUrl}/${kashierOrderId}`);
    console.log('📋 Refund payload:', JSON.stringify(refundPayload, null, 2));

    const response = await axios.put(
      `${fepUrl}/${kashierOrderId}/`,
      refundPayload,
      {
        headers: {
          'Authorization': cleanSecretKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Refund response:', JSON.stringify(response.data, null, 2));

    // Check refund status
    if (response.data && response.data.status === 'SUCCESS') {
      const refundData = response.data.response;
      return {
        success: true,
        status: 'SUCCESS',
        transactionId: refundData?.transactionId,
        amount: refundData?.amount,
        currency: refundData?.currency,
        message: response.data.messages?.en || 'Refund processed successfully'
      };
    } else if (response.data && response.data.status === 'PENDING') {
      return {
        success: true,
        status: 'PENDING',
        message: 'Refund initiated, waiting for processor confirmation'
      };
    } else {
      console.error('❌ Refund failed:', response.data);
      return {
        success: false,
        status: response.data?.status || 'FAILURE',
        message: response.data?.messages?.en || 'Refund processing failed'
      };
    }

  } catch (error) {
    console.error('❌ Refund error:', error.response?.data || error.message);

    // Return error details
    return {
      success: false,
      status: 'ERROR',
      message: error.response?.data?.messages?.en || error.message,
      error: error.response?.data || error.message
    };
  }
};

module.exports = {
  createPaymentSession,
  getPaymentStatus,
  verifyWebhookSignature,
  processSuccessfulPayment,
  isPaymentSuccessful,
  isPaymentPending,
  isPaymentFailed,
  processRefund
};
