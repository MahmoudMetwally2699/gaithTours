const express = require('express');
const { protect } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const stripeService = require('../utils/stripeService');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { sendPaymentConfirmationEmail } = require('../utils/emailService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

/**
 * Create payment session for invoice
 * POST /api/payments/create-session
 */
router.post('/create-session', protect, async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return errorResponse(res, 'Invoice ID is required', 400);
    }

    const result = await stripeService.createCheckoutSession(invoiceId, req.user.id);

    successResponse(res, {
      sessionId: result.sessionId,
      url: result.url,
      paymentId: result.payment._id
    }, 'Payment session created successfully');

  } catch (error) {
    console.error('Create payment session error:', error);

    if (error.message === 'Invoice not found') {
      return errorResponse(res, 'Invoice not found', 404);
    }
    if (error.message === 'Unauthorized access to invoice') {
      return errorResponse(res, 'Unauthorized access to invoice', 403);
    }
    if (error.message === 'Invoice is already paid') {
      return errorResponse(res, 'Invoice is already paid', 400);
    }

    errorResponse(res, 'Failed to create payment session', 500);
  }
});

/**
 * Debug route to check webhook configuration
 * GET /api/payments/webhook-debug
 */
router.get('/webhook-debug', (req, res) => {
  res.json({
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    environment: process.env.NODE_ENV,
    stripePublishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
    stripeSecretKey: !!process.env.STRIPE_SECRET_KEY
  });
});

/**
 * Stripe webhook handler (no authentication required)
 * POST /api/payments/webhook
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('Webhook received');
  console.log('Signature exists:', !!sig);
  console.log('Endpoint secret exists:', !!endpointSecret);
  console.log('Raw body type:', typeof req.body);
  console.log('Raw body is Buffer:', Buffer.isBuffer(req.body));
  console.log('Raw body length:', req.body ? req.body.length : 'undefined');

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!sig) {
    console.error('No stripe-signature header found');
    return res.status(400).json({ error: 'No signature header' });
  }
  let event;
  try {
    // Use Stripe's direct webhook verification instead of custom wrapper
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Webhook verified successfully:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const sessionId = session.id;

        console.log('Processing checkout.session.completed for session:', sessionId);

        // Handle successful payment
        try {
          const result = await stripeService.handlePaymentSuccess(sessionId);

          console.log('Payment success handled:', {
            invoiceId: result.invoice._id,
            paymentId: result.payment._id,
            status: result.payment.status
          });

          // Send payment confirmation email
          try {
            await sendPaymentConfirmationEmail({
              email: result.invoice.clientEmail,
              name: result.invoice.clientName,
              invoice: result.invoice,
              payment: result.payment
            });
            console.log('Payment confirmation email sent');
          } catch (emailError) {
            console.error('Failed to send payment confirmation email:', emailError);
          }
        } catch (paymentError) {
          console.error('Error handling payment success:', paymentError);
        }
        break;

      case 'checkout.session.expired':
        const expiredSession = event.data.object;
        console.log('Checkout session expired:', expiredSession.id);
        // Update payment status to expired
        try {
          await stripeService.handlePaymentFailure(expiredSession.id, 'Session expired');
        } catch (error) {
          console.error('Error handling expired session:', error);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        break;

      default:
        console.log('Unhandled webhook event type:', event.type);
    }    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    console.error('Webhook processing error stack:', err.stack);
    return res.status(500).send(`Webhook Processing Error: ${err.message}`);
  }
});

/**
 * Get payment status by session ID (no authentication required for redirect)
 * GET /api/payments/session/:sessionId
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const status = await stripeService.getPaymentStatus(sessionId);

    successResponse(res, status, 'Payment status retrieved');
  } catch (error) {
    console.error('Get payment status error:', error);
    errorResponse(res, 'Failed to get payment status', 500);
  }
});

/**
 * Handle payment success callback (for backward compatibility)
 * POST /api/payments/success
 */
router.post('/success', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return errorResponse(res, 'Session ID is required', 400);
    }

    const result = await stripeService.handlePaymentSuccess(sessionId);

    successResponse(res, {
      invoice: result.invoice,
      payment: result.payment
    }, 'Payment processed successfully');

  } catch (error) {
    console.error('Payment success handler error:', error);
    errorResponse(res, 'Failed to process payment success', 500);
  }
});

/**
 * Handle payment failure
 * POST /api/payments/failure
 */
router.post('/failure', protect, async (req, res) => {
  try {
    const { sessionId, reason } = req.body;

    if (!sessionId) {
      return errorResponse(res, 'Session ID is required', 400);
    }

    const payment = await stripeService.handlePaymentFailure(sessionId, reason);

    successResponse(res, { payment }, 'Payment failure recorded');

  } catch (error) {
    console.error('Payment failure handler error:', error);
    errorResponse(res, 'Failed to handle payment failure', 500);
  }
});

/**
 * Get payment status
 * GET /api/payments/status/:sessionId
 */
router.get('/status/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await stripeService.getPaymentStatus(sessionId);

    successResponse(res, result, 'Payment status retrieved successfully');

  } catch (error) {
    console.error('Get payment status error:', error);
    errorResponse(res, 'Failed to get payment status', 500);
  }
});

/**
 * Get user invoices with payment status
 * GET /api/payments/invoices
 */
router.get('/invoices', protect, async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id })
      .populate('reservation')
      .sort({ createdAt: -1 });

    // Get payment information for each invoice
    const invoicesWithPayments = await Promise.all(
      invoices.map(async (invoice) => {
        const payment = await Payment.findOne({ invoice: invoice._id })
          .sort({ createdAt: -1 });

        return {
          ...invoice.toObject(),
          payment: payment || null
        };
      })
    );

    successResponse(res, { invoices: invoicesWithPayments }, 'User invoices retrieved successfully');

  } catch (error) {
    console.error('Get user invoices error:', error);
    errorResponse(res, 'Failed to get user invoices', 500);
  }
});

/**
 * Get user payments history
 * GET /api/payments/history
 */
router.get('/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('invoice')
      .sort({ createdAt: -1 });

    successResponse(res, { payments }, 'Payment history retrieved successfully');

  } catch (error) {
    console.error('Get payment history error:', error);
    errorResponse(res, 'Failed to get payment history', 500);
  }
});

/**
 * Create payment intent for direct payment
 * POST /api/payments/create-intent
 */
router.post('/create-intent', protect, async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return errorResponse(res, 'Invoice ID is required', 400);
    }

    const paymentIntent = await stripeService.createPaymentIntent(invoiceId, req.user.id);

    successResponse(res, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }, 'Payment intent created successfully');

  } catch (error) {
    console.error('Create payment intent error:', error);

    if (error.message === 'Invoice not found') {
      return errorResponse(res, 'Invoice not found', 404);
    }
    if (error.message === 'Unauthorized access to invoice') {
      return errorResponse(res, 'Unauthorized access to invoice', 403);
    }
    if (error.message === 'Invoice is already paid') {
      return errorResponse(res, 'Invoice is already paid', 400);
    }    errorResponse(res, 'Failed to create payment intent', 500);
  }
});

/**
 * Get individual invoice details
 * GET /api/payments/invoices/:id
 */
router.get('/invoices/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate('reservation')
      .populate('user', 'firstName lastName email');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    // Check if user owns this invoice
    if (invoice.user._id.toString() !== req.user.id) {
      return errorResponse(res, 'Unauthorized access to invoice', 403);
    }

    // Get payment information
    const payment = await Payment.findOne({ invoice: invoice._id })
      .sort({ createdAt: -1 });

    const invoiceWithPayment = {
      ...invoice.toObject(),
      payment: payment || null
    };

    successResponse(res, { invoice: invoiceWithPayment }, 'Invoice details retrieved successfully');

  } catch (error) {
    console.error('Get invoice details error:', error);
    errorResponse(res, 'Failed to get invoice details', 500);
  }
});

/**
 * Download invoice receipt as PDF
 * GET /api/payments/invoices/:id/receipt
 */
router.get('/invoices/:id/receipt', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate('reservation')
      .populate('user', 'firstName lastName email');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    // Check if user owns this invoice
    if (invoice.user._id.toString() !== req.user.id) {
      return errorResponse(res, 'Unauthorized access to invoice', 403);
    }

    // Check if invoice is paid
    if (invoice.paymentStatus !== 'paid') {
      return errorResponse(res, 'Receipt only available for paid invoices', 400);
    }

    // Get payment information
    const payment = await Payment.findOne({ invoice: invoice._id, status: 'completed' })
      .sort({ createdAt: -1 });

    if (!payment) {
      return errorResponse(res, 'Payment information not found', 404);
    }

    // Generate PDF receipt
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${invoice.invoiceNumber}.pdf"`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to PDF
    // Header
    doc.fontSize(20).text('PAYMENT RECEIPT', 50, 50, { align: 'center' });
    doc.moveDown();

    // Company information (you can customize this)
    doc.fontSize(12)
       .text('Gaith Group', 50, 120)
       .text('Hotel Booking Services', 50, 135)
       .moveDown();

    // Receipt details
    doc.text(`Receipt #: ${invoice.invoiceNumber}`, 50, 170)
       .text(`Date: ${new Date(payment.processedAt || payment.createdAt).toLocaleDateString()}`, 50, 185)
       .text(`Customer: ${invoice.user.firstName} ${invoice.user.lastName}`, 50, 200)
       .text(`Email: ${invoice.user.email}`, 50, 215)
       .moveDown();

    // Invoice details
    doc.text('BOOKING DETAILS:', 50, 250)
       .text(`Hotel: ${invoice.hotelName}`, 50, 270)
       .text(`Guest: ${invoice.clientName}`, 50, 285)
       .text(`Email: ${invoice.clientEmail}`, 50, 300)
       .text(`Phone: ${invoice.clientPhone}`, 50, 315)
       .text(`Nationality: ${invoice.clientNationality}`, 50, 330)
       .moveDown();

    // Payment details
    doc.text('PAYMENT DETAILS:', 50, 370)
       .text(`Amount: ${invoice.amount.toFixed(2)} ${invoice.currency.toUpperCase()}`, 50, 390)
       .text(`Payment Method: ${payment.paymentMethod || 'Card'}`, 50, 405)
       .text(`Transaction ID: ${payment.stripePaymentIntentId || payment.transactionId || 'N/A'}`, 50, 420)
       .text(`Status: PAID`, 50, 435)
       .moveDown();

    // Footer
    doc.fontSize(10)
       .text('Thank you for choosing Gaith Group!', 50, 500, { align: 'center' })
       .text('This is an electronically generated receipt.', 50, 515, { align: 'center' });

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('Generate receipt PDF error:', error);
    errorResponse(res, 'Failed to generate receipt', 500);
  }
});

module.exports = router;
