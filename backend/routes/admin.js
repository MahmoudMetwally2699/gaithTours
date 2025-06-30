const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const { protect, admin } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const { sendInvoiceEmail, sendBookingDenialEmail, sendBookingConfirmationEmail } = require('../utils/emailService');
const whatsappService = require('../utils/whatsappService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Admin dashboard stats
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalClients = await User.countDocuments({ role: 'user' });
    const totalBookings = await Reservation.countDocuments();
    const pendingBookings = await Reservation.countDocuments({ status: 'pending' });
    const totalInvoices = await Invoice.countDocuments();
    const paidInvoices = await Invoice.countDocuments({ status: 'paid' });
    const totalRevenue = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // WhatsApp stats
    const totalWhatsAppMessages = await WhatsAppMessage.countDocuments();
    const unreadWhatsAppMessages = await WhatsAppMessage.countDocuments({ isRead: false, direction: 'incoming' });

    const stats = {
      totalClients,
      totalBookings,
      pendingBookings,
      totalInvoices,
      paidInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalWhatsAppMessages,
      unreadWhatsAppMessages
    };

    successResponse(res, { stats }, 'Dashboard stats retrieved successfully');
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    errorResponse(res, 'Failed to get dashboard stats', 500);
  }
});

// Get all clients
router.get('/clients', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let query = { role: 'user' };
    if (search) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
//HI
    const clients = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await User.countDocuments(query);

    successResponse(res, {
      clients,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalClients: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }, 'Clients retrieved successfully');
  } catch (error) {
    console.error('Get clients error:', error);
    errorResponse(res, 'Failed to get clients', 500);
  }
});

// Get client details with booking history
router.get('/clients/:id', protect, admin, async (req, res) => {
  try {
    const client = await User.findById(req.params.id).select('-password');
    if (!client || client.role !== 'user') {
      return errorResponse(res, 'Client not found', 404);
    }

    const bookings = await Reservation.find({ user: req.params.id })
      .sort({ createdAt: -1 });

    const invoices = await Invoice.find({ user: req.params.id })
      .sort({ createdAt: -1 });

    successResponse(res, { client, bookings, invoices }, 'Client details retrieved successfully');
  } catch (error) {
    console.error('Get client details error:', error);
    errorResponse(res, 'Failed to get client details', 500);
  }
});

// Create new client
router.post('/clients', protect, admin, [
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number'),
  body('nationality').optional().isLength({ min: 2 }).withMessage('Nationality must be at least 2 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { name, email, password, phone, nationality, preferredLanguage } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'User already exists with this email', 400);
    }

    // Create new client
    const client = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      nationality: nationality || '',
      preferredLanguage: preferredLanguage || 'en',
      role: 'user'
    });

    // Remove password from response
    const clientResponse = await User.findById(client._id).select('-password');

    successResponse(res, { client: clientResponse }, 'Client created successfully', 201);
  } catch (error) {
    console.error('Create client error:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'Email already exists', 400);
    }
    errorResponse(res, 'Failed to create client', 500);
  }
});

// Update client details
router.put('/clients/:id', protect, admin, [
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number'),
  body('nationality').optional().isLength({ min: 2 }).withMessage('Nationality must be at least 2 characters long'),
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, phone, nationality, name } = req.body;
    const updateData = {};

    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (nationality) updateData.nationality = nationality;
    if (name) updateData.name = name;

    const client = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!client || client.role !== 'user') {
      return errorResponse(res, 'Client not found', 404);
    }

    successResponse(res, { client }, 'Client updated successfully');
  } catch (error) {
    console.error('Update client error:', error);
    errorResponse(res, 'Failed to update client', 500);
  }
});

// Get all booking requests
router.get('/bookings', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    const bookings = await Reservation.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Reservation.countDocuments(query);

    successResponse(res, {
      bookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBookings: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }, 'Booking requests retrieved successfully');
  } catch (error) {
    console.error('Get booking requests error:', error);
    errorResponse(res, 'Failed to get booking requests', 500);
  }
});

// Approve booking request
router.patch('/bookings/:id/approve', protect, admin, async (req, res) => {
  try {
    const booking = await Reservation.findById(req.params.id).populate('user');
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.status !== 'pending') {
      return errorResponse(res, 'Booking cannot be approved', 400);
    }

    // Ensure required fields have default values if missing
    if (!booking.roomType) {
      booking.roomType = 'double'; // Default room type
    }
    if (!booking.stayType) {
      booking.stayType = 'room_only'; // Default stay type
    }
    if (!booking.paymentMethod) {
      booking.paymentMethod = 'pending'; // Default payment method
    }

    // Update booking status
    booking.status = 'approved';
    await booking.save();    // Generate invoice
    const amount = parseFloat(req.body.amount) || 3750; // Default amount or from request (SAR)

    // Generate invoice ID manually
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Find the last invoice of the day
    const lastInvoice = await Invoice.findOne({
      invoiceId: new RegExp(`^INV-${year}${month}${day}-`)
    }).sort({ createdAt: -1 });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceId.split('-')[2]);
      sequence = lastSequence + 1;
    }

    const invoiceId = `INV-${year}${month}${day}-${String(sequence).padStart(3, '0')}`;

    console.log('Creating invoice with data:', {
      invoiceId: invoiceId,
      user: booking.user._id,
      reservation: booking._id,
      clientName: booking.touristName,
      clientEmail: booking.email,
      clientPhone: booking.phone,
      clientNationality: booking.nationality,
      hotelName: booking.hotel.name,
      hotelAddress: booking.hotel.address || booking.hotel.name,
      amount: amount
    });

    const invoice = new Invoice({
      invoiceId: invoiceId,
      user: booking.user._id,
      reservation: booking._id,
      clientName: booking.touristName,
      clientEmail: booking.email,
      clientPhone: booking.phone,
      clientNationality: booking.nationality,
      hotelName: booking.hotel.name,
      hotelAddress: booking.hotel.address || booking.hotel.name,
      amount: amount
    });

    console.log('Invoice before save:', invoice);
    await invoice.save();
    console.log('Invoice after save:', invoice);

    // Update booking status to invoiced
    booking.status = 'invoiced';
    await booking.save();    // Send invoice email
    try {
      await sendInvoiceEmail({
        email: booking.email,
        name: booking.touristName,
        invoice: invoice,
        booking: booking
      });
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
    }

    // Send WhatsApp notification
    try {
      await whatsappService.sendBookingApprovalNotification(booking, invoice);
    } catch (whatsappError) {
      console.error('Failed to send WhatsApp notification:', whatsappError);
    }

    successResponse(res, { booking, invoice }, 'Booking approved and invoice generated successfully');
  } catch (error) {
    console.error('Approve booking error:', error);
    errorResponse(res, 'Failed to approve booking', 500);
  }
});

// Deny booking request
router.patch('/bookings/:id/deny', protect, admin, [
  body('reason').optional().isLength({ min: 10 }).withMessage('Denial reason must be at least 10 characters long')
], async (req, res) => {
  try {
    const booking = await Reservation.findById(req.params.id).populate('user');
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.status !== 'pending') {
      return errorResponse(res, 'Booking cannot be denied', 400);
    }

    const reason = req.body.reason || 'Your booking request has been denied.';

    // Update booking status
    booking.status = 'denied';
    booking.notes = reason;
    await booking.save();    // Send denial email
    try {
      await sendBookingDenialEmail({
        email: booking.email,
        name: booking.touristName,
        booking: booking,
        reason: reason
      });
    } catch (emailError) {
      console.error('Failed to send denial email:', emailError);
    }

    // Send WhatsApp notification
    try {
      await whatsappService.sendBookingDenialNotification(booking, reason);
    } catch (whatsappError) {
      console.error('Failed to send denial WhatsApp notification:', whatsappError);
    }

    successResponse(res, { booking }, 'Booking denied successfully');
  } catch (error) {
    console.error('Deny booking error:', error);
    errorResponse(res, 'Failed to deny booking', 500);
  }
});

// Get all invoices
router.get('/invoices', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    const invoices = await Invoice.find(query)
      .populate('user', 'name email')
      .populate('reservation', 'hotel.name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Invoice.countDocuments(query);

    successResponse(res, {
      invoices,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalInvoices: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }, 'Invoices retrieved successfully');
  } catch (error) {
    console.error('Get invoices error:', error);
    errorResponse(res, 'Failed to get invoices', 500);
  }
});

// Get invoice details
router.get('/invoices/:id', protect, admin, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('user', 'name email phone nationality')
      .populate('reservation');

    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }

    successResponse(res, { invoice }, 'Invoice details retrieved successfully');
  } catch (error) {
    console.error('Get invoice details error:', error);
    errorResponse(res, 'Failed to get invoice details', 500);
  }
});

// Get all payments
router.get('/payments', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('user', 'name email')
      .populate('invoice', 'invoiceId amount')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Payment.countDocuments(query);

    successResponse(res, {
      payments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }, 'Payments retrieved successfully');
  } catch (error) {
    console.error('Get payments error:', error);
    errorResponse(res, 'Failed to get payments', 500);
  }
});

// Test WhatsApp functionality (development only)
router.post('/test-whatsapp', protect, admin, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return errorResponse(res, 'Phone number and message are required', 400);
    }

    await whatsappService.sendMessage(phoneNumber, message);
    successResponse(res, {}, 'WhatsApp message sent successfully');
  } catch (error) {
    console.error('Test WhatsApp error:', error);
    errorResponse(res, 'Failed to send WhatsApp message', 500);
  }
});

module.exports = router;
