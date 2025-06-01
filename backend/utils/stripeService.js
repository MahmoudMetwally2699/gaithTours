const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Reservation = require('../models/Reservation');

/**
 * Create a Stripe Checkout Session for invoice payment
 */
const createCheckoutSession = async (invoiceId, userId) => {
  try {
    // Find invoice
    const invoice = await Invoice.findById(invoiceId)
      .populate('user')
      .populate('reservation');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.user._id.toString() !== userId) {
      throw new Error('Unauthorized access to invoice');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice is already paid');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Hotel Booking - ${invoice.hotelName}`,
              description: `Invoice ${invoice.invoiceId} - ${invoice.clientName}`,
              images: [], // You can add hotel images here
            },
            unit_amount: Math.round(invoice.amount * 100), // Stripe expects amount in cents
          },
          quantity: 1,
        },
      ],      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoiceId}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/failure?invoice_id=${invoiceId}`,
      metadata: {
        invoiceId: invoiceId,
        userId: userId,
        invoiceNumber: invoice.invoiceId,
      },
      customer_email: invoice.clientEmail,
      billing_address_collection: 'required',
    });

    // Create payment record
    const payment = new Payment({
      invoice: invoiceId,
      user: userId,
      amount: invoice.amount,
      currency: invoice.currency,
      paymentMethod: 'stripe',
      status: 'pending',
      stripeSessionId: session.id,
      metadata: {
        checkoutSessionId: session.id,
        invoiceNumber: invoice.invoiceId,
      }
    });

    await payment.save();

    return {
      sessionId: session.id,
      url: session.url,
      payment: payment
    };

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw error;
  }
};

/**
 * Handle successful payment completion
 */
const handlePaymentSuccess = async (sessionId) => {
  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });

    if (!session.metadata.invoiceId) {
      throw new Error('Invoice ID not found in session metadata');
    }

    // Find the invoice and payment
    const invoice = await Invoice.findById(session.metadata.invoiceId);
    const payment = await Payment.findOne({ stripeSessionId: sessionId });

    if (!invoice || !payment) {
      throw new Error('Invoice or payment not found');
    }

    console.log('🔍 Invoice found:', {
      id: invoice._id,
      status: invoice.status,
      reservationId: invoice.reservation
    });

    // Update invoice status
    invoice.status = 'paid';
    invoice.paymentStatus = 'paid';
    invoice.paymentDetails = {
      stripePaymentIntentId: session.payment_intent.id,
      paidAt: new Date(),
      paymentMethod: 'stripe'
    };
    await invoice.save();

    // Update payment status
    payment.status = 'completed';
    payment.stripePaymentIntentId = session.payment_intent.id;
    payment.transactionId = session.payment_intent.id;
    payment.processedAt = new Date();    payment.metadata = {
      ...payment.metadata,
      sessionId: sessionId,
      paymentIntentId: session.payment_intent.id
    };
    await payment.save();    // Update reservation status to confirmed when payment is completed
    console.log('🔄 Checking reservation update:', {
      hasReservation: !!invoice.reservation,
      reservationId: invoice.reservation
    });

    if (invoice.reservation) {
      const reservation = await Reservation.findById(invoice.reservation);
      console.log('📋 Found reservation:', {
        id: reservation?._id,
        currentStatus: reservation?.status
      });

      if (reservation) {
        const oldStatus = reservation.status;
        reservation.status = 'confirmed';
        await reservation.save();
        console.log(`✅ Reservation ${reservation._id} status updated from ${oldStatus} to confirmed`);
      } else {
        console.log('❌ Reservation not found with ID:', invoice.reservation);
      }
    } else {
      console.log('❌ Invoice has no reservation reference');
    }

    return {
      invoice,
      payment,
      session
    };

  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
};

/**
 * Handle failed payment
 */
const handlePaymentFailure = async (sessionId, reason) => {
  try {
    const payment = await Payment.findOne({ stripeSessionId: sessionId });

    if (payment) {
      payment.status = 'failed';
      payment.failureReason = reason;
      payment.processedAt = new Date();
      await payment.save();
    }

    return payment;
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
};

/**
 * Get payment status by session ID
 */
const getPaymentStatus = async (sessionId) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const payment = await Payment.findOne({ stripeSessionId: sessionId })
      .populate('invoice')
      .populate('user');

    return {
      session,
      payment,
      status: session.payment_status
    };
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
};

/**
 * Create payment intent for direct payment
 */
const createPaymentIntent = async (invoiceId, userId) => {
  try {
    const invoice = await Invoice.findById(invoiceId).populate('user');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.user._id.toString() !== userId) {
      throw new Error('Unauthorized access to invoice');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice is already paid');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.amount * 100), // Amount in cents
      currency: invoice.currency.toLowerCase(),
      metadata: {
        invoiceId: invoiceId,
        userId: userId,
        invoiceNumber: invoice.invoiceId,
      },
      description: `Payment for ${invoice.hotelName} - Invoice ${invoice.invoiceId}`,
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Construct and verify webhook event
 */
const constructWebhookEvent = (body, signature) => {
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
};

module.exports = {
  createCheckoutSession,
  handlePaymentSuccess,
  handlePaymentFailure,
  getPaymentStatus,
  createPaymentIntent,
  constructWebhookEvent
};
