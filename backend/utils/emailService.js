const nodemailer = require('nodemailer');
const path = require('path');
const InvoicePDFGenerator = require('./invoicePdfGenerator');
const { getBookingConfirmationTemplate } = require('./emailTemplates');
require('dotenv').config();

// Create email transporter
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    // Add timeout configurations to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,    // 5 seconds
    socketTimeout: 15000      // 15 seconds
  });

  return transporter;
};

// Send reservation confirmation email
const sendReservationConfirmation = async (reservationData) => {
  try {
    const transporter = createTransporter();
    const { email } = reservationData;

    // Generate HTML from template
    const htmlContent = getBookingConfirmationTemplate(reservationData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '✈️ Booking Confirmed! - Gaith Tours', // Updated subject to match vibe
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Email could not be sent: ' + error.message);
  }
};

// Send agency notification email
const sendAgencyNotification = async (reservationData) => {
  try {
    const transporter = createTransporter();

    const {
      reservation,
      touristName,
      email,
      phone,
      nationality,
      expectedCheckInTime,
      roomType,
      stayType,
      paymentMethod,
      numberOfGuests,
      guests,
      hotel,
      checkInDate,
      checkOutDate,
      notes
    } = reservationData;    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      subject: '🚨 New Hotel Reservation Request - Gaith Tours',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Reservation Request</title>          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            * { box-sizing: border-box; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.2); margin-top: 20px; margin-bottom: 20px;">

            <!-- Alert Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center; position: relative;">
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1);"></div>
              <div style="position: relative; z-index: 1;">                <h1 style="color: #ffffff; font-size: 30px; font-weight: 800; margin: 0 0 12px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: -0.5px;">🚨 NEW RESERVATION ALERT</h1>
                <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50px; padding: 14px 28px; display: inline-block; margin-top: 12px; border: 1px solid rgba(255,255,255,0.3);">
                  <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">📝 Requires Immediate Attention</p>
                </div>
              </div>
            </div>

            <!-- Urgent Badge -->
            <div style="text-align: center; margin: -25px 0 30px 0;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50px; padding: 15px 30px; display: inline-block; box-shadow: 0 10px 25px rgba(245, 158, 11, 0.4); animation: pulse 2s infinite;">
                <span style="color: #ffffff; font-size: 16px; font-weight: 700;">⚡ URGENT: New Booking Request</span>
              </div>
            </div>

            <!-- Content Container -->
            <div style="padding: 0 30px 40px 30px;">

              <!-- Customer Details Card -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%); border-radius: 16px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #f59e0b; box-shadow: 0 8px 16px rgba(251, 191, 36, 0.2);">
                <h3 style="color: #92400e; font-size: 20px; font-weight: 700; margin: 0 0 20px 0; display: flex; align-items: center;">
                  👤 Customer Details
                  <span style="background: #dc2626; color: white; font-size: 12px; padding: 4px 8px; border-radius: 12px; margin-left: 10px;">NEW</span>
                </h3>
                <div style="background: rgba(255,255,255,0.6); border-radius: 12px; padding: 20px;">
                  <div style="display: grid; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px;">
                      <span style="color: #92400e; font-weight: 600; display: flex; align-items: center;"><span style="margin-right: 8px;">🏷️</span>Name:</span>
                      <span style="color: #451a03; font-weight: 700; font-size: 16px;">${touristName}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px;">
                      <span style="color: #92400e; font-weight: 600; display: flex; align-items: center;"><span style="margin-right: 8px;">📧</span>Email:</span>
                      <span style="color: #2563eb; font-weight: 600;">${email}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px;">
                      <span style="color: #92400e; font-weight: 600; display: flex; align-items: center;"><span style="margin-right: 8px;">📱</span>Phone:</span>
                      <span style="color: #451a03; font-weight: 700;">${phone}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px;">
                      <span style="color: #92400e; font-weight: 600; display: flex; align-items: center;"><span style="margin-right: 8px;">🌍</span>Nationality:</span>
                      <span style="color: #451a03; font-weight: 700;">${nationality}</span>
                    </div>
                    ${expectedCheckInTime ? `
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px;">
                        <span style="color: #92400e; font-weight: 600; display: flex; align-items: center;"><span style="margin-right: 8px;">⏰</span>Expected Check-in:</span>
                        <span style="color: #451a03; font-weight: 700;">${expectedCheckInTime}</span>
                      </div>
                    ` : ''}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                      <div style="padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px; text-align: center;">
                        <div style="color: #92400e; font-weight: 600; font-size: 14px; margin-bottom: 5px;">🏨 Room Type</div>
                        <div style="color: #451a03; font-weight: 700;">${roomType}</div>
                      </div>
                      <div style="padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px; text-align: center;">
                        <div style="color: #92400e; font-weight: 600; font-size: 14px; margin-bottom: 5px;">🍽️ Stay Type</div>
                        <div style="color: #451a03; font-weight: 700;">${stayType}</div>
                      </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                      <div style="padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px; text-align: center;">
                        <div style="color: #92400e; font-weight: 600; font-size: 14px; margin-bottom: 5px;">💳 Payment</div>
                        <div style="color: #451a03; font-weight: 700;">${paymentMethod}</div>
                      </div>
                      <div style="padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px; text-align: center;">
                        <div style="color: #92400e; font-weight: 600; font-size: 14px; margin-bottom: 5px;">👥 Guests</div>
                        <div style="color: #451a03; font-weight: 700; background: #dbeafe; color: #1d4ed8; padding: 4px 8px; border-radius: 12px; display: inline-block;">${numberOfGuests || 1}</div>
                      </div>
                    </div>
                  </div>
                </div>

                ${guests && guests.length > 0 ? `
                  <div style="margin-top: 20px; background: rgba(255,255,255,0.6); border-radius: 12px; padding: 15px;">
                    <h4 style="color: #92400e; font-weight: 700; margin: 0 0 15px 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">👥</span>Additional Guests:
                    </h4>
                    ${guests.map(guest => `
                      <div style="background: rgba(255,255,255,0.8); padding: 10px 15px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #451a03; font-weight: 600;">${guest.fullName}</span>
                        <span style="color: #2563eb; font-weight: 600; background: #dbeafe; padding: 4px 8px; border-radius: 6px; font-size: 14px;">${guest.phoneNumber}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>

              <!-- Hotel Details Card -->
              <div style="background: linear-gradient(135deg, #ddd6fe 0%, #8b5cf6 100%); border-radius: 16px; padding: 25px; margin-bottom: 25px; box-shadow: 0 8px 16px rgba(139, 92, 246, 0.2);">
                <h3 style="color: #581c87; font-size: 20px; font-weight: 700; margin: 0 0 20px 0; display: flex; align-items: center;">
                  🏢 Hotel Details
                </h3>
                <div style="background: rgba(255,255,255,0.4); border-radius: 12px; padding: 20px;">
                  <h4 style="color: #3c1361; font-size: 22px; font-weight: 800; margin: 0 0 15px 0; text-align: center; background: rgba(255,255,255,0.6); padding: 15px; border-radius: 10px;">${hotel.name}</h4>                  <div style="display: grid; gap: 12px;">
                    <div style="background: rgba(255,255,255,0.6); padding: 12px; border-radius: 8px; display: flex; align-items: center;">
                      <span style="margin-right: 10px; font-size: 18px;">📍</span>
                      <span style="color: #581c87; font-weight: 600;">${hotel.address}, ${hotel.city}, ${hotel.country}</span>
                    </div>
                    ${hotel.rating ? `
                      <div style="background: rgba(255,255,255,0.6); padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <span style="margin-right: 10px; font-size: 18px;">⭐</span>
                        <span style="color: #581c87; font-weight: 700; font-size: 16px;">Rating: ${hotel.rating}/10</span>
                      </div>
                    ` : ''}
                    ${hotel.url ? `
                      <div style="background: rgba(255,255,255,0.6); padding: 12px; border-radius: 8px; display: flex; align-items: center;">
                        <span style="margin-right: 10px; font-size: 18px;">🔗</span>
                        <a href="${hotel.url}" target="_blank" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Visit Hotel Website</a>
                      </div>
                    ` : ''}
                    ${hotel.price ? `
                      <div style="background: rgba(255,255,255,0.6); padding: 12px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <span style="margin-right: 10px; font-size: 18px;">💰</span>
                        <span style="color: #581c87; font-weight: 700; font-size: 16px;">Expected Price: ${hotel.price} SAR</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>

              ${checkInDate && checkOutDate ? `
                <!-- Stay Period Card -->
                <div style="background: linear-gradient(135deg, #dcfce7 0%, #22c55e 100%); border-radius: 16px; padding: 25px; margin-bottom: 25px; box-shadow: 0 8px 16px rgba(34, 197, 94, 0.2);">
                  <h3 style="color: #14532d; font-size: 20px; font-weight: 700; margin: 0 0 20px 0; display: flex; align-items: center;">
                    📅 Stay Period
                  </h3>
                  <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; align-items: center;">
                    <div style="background: rgba(255,255,255,0.6); border-radius: 12px; padding: 20px; text-align: center;">
                      <div style="color: #14532d; font-weight: 600; font-size: 14px; margin-bottom: 8px;">✅ Check-in</div>
                      <div style="color: #052e16; font-weight: 800; font-size: 18px;">${new Date(checkInDate).toLocaleDateString()}</div>
                    </div>
                    <div style="color: #14532d; font-size: 24px; font-weight: 700;">→</div>
                    <div style="background: rgba(255,255,255,0.6); border-radius: 12px; padding: 20px; text-align: center;">
                      <div style="color: #14532d; font-weight: 600; font-size: 14px; margin-bottom: 8px;">📤 Check-out</div>
                      <div style="color: #052e16; font-weight: 800; font-size: 18px;">${new Date(checkOutDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ` : ''}

              ${notes ? `
                <!-- Special Notes Card -->
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #f59e0b 100%); border-radius: 16px; padding: 25px; margin-bottom: 25px; box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);">
                  <h3 style="color: #92400e; font-size: 20px; font-weight: 700; margin: 0 0 15px 0; display: flex; align-items: center;">
                    📝 Special Notes
                  </h3>
                  <div style="background: rgba(255,255,255,0.6); border-radius: 12px; padding: 20px;">
                    <p style="color: #451a03; margin: 0; line-height: 1.8; font-weight: 500; font-size: 16px;">${notes}</p>
                  </div>
                </div>
              ` : ''}

              <!-- Action Required Section -->
              <div style="background: linear-gradient(135deg, #fee2e2 0%, #ef4444 100%); border-radius: 16px; padding: 25px; margin-bottom: 30px; box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3); border: 3px solid #dc2626;">
                <div style="text-align: center;">
                  <h3 style="color: #7f1d1d; font-size: 22px; font-weight: 800; margin: 0 0 15px 0; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 28px; margin-right: 10px;">⚡</span>
                    ACTION REQUIRED
                  </h3>
                  <div style="background: rgba(255,255,255,0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <p style="color: #7f1d1d; margin: 0 0 15px 0; font-weight: 600; font-size: 16px;">Contact customer within 24 hours to confirm reservation and provide payment details.</p>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                    <div style="background: rgba(255,255,255,0.4); border-radius: 8px; padding: 15px;">
                      <div style="color: #7f1d1d; font-weight: 700; font-size: 14px;">📋 Reservation ID</div>
                      <div style="color: #450a0a; font-weight: 800; font-family: monospace; background: rgba(255,255,255,0.6); padding: 8px; border-radius: 6px; margin-top: 5px; word-break: break-all;">${reservation._id}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.4); border-radius: 8px; padding: 15px;">
                      <div style="color: #7f1d1d; font-weight: 700; font-size: 14px;">📅 Request Date</div>
                      <div style="color: #450a0a; font-weight: 800; margin-top: 5px;">${new Date().toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding: 30px 0; border-top: 3px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 50px; padding: 15px 30px; display: inline-block; margin-bottom: 20px;">
                  <p style="color: #ffffff; margin: 0; font-weight: 700; font-size: 16px;">🚨 Gaith Tours - Admin Dashboard</p>
                </div>
                <p style="color: #64748b; margin: 0; font-size: 14px;">This is an automated notification. Please process this request promptly.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Agency notification email error:', error);
    throw new Error('Email could not be sent: ' + error.message);
  }
};

// Send welcome email
const sendWelcomeEmail = async (userData) => {
  try {
    const transporter = createTransporter();

    const { email, name } = userData;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Gaith Tours!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">Welcome to Gaith Tours!</h1>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px;">
            <p>Dear ${name},</p>
            <p>Thank you for joining Gaith Tours! We're excited to help you discover amazing destinations and create unforgettable travel experiences.</p>
            <p>You can now browse and book hotels through our platform.</p>
            <p>Happy travels!</p>
            <p>Best regards,<br>The Gaith Tours Team</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Welcome email error:', error);
    throw new Error('Email could not be sent: ' + error.message);
  }
};

// Send cancellation email
const sendCancellationEmail = async (reservationData) => {
  try {
    const transporter = createTransporter();

    const {
      email,
      reservationId,
      hotelName,
      customerName,
      checkInDate,
      checkOutDate,
      penalty,
      refundAmount
    } = reservationData;

    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatCurrency = (amount, currency = 'USD') => {
      if (!amount) return null;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(amount);
    };

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '❌ Booking Cancellation Confirmed - Gaith Tours | تأكيد إلغاء الحجز',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Cancellation</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            * { box-sizing: border-box; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 45px 30px; text-align: center; position: relative;">
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1);"></div>
              <div style="position: relative; z-index: 1;">
                <h1 style="color: #ffffff; font-size: 34px; font-weight: 800; margin: 0 0 12px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">✈️ Gaith Tours</h1>
                <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50px; padding: 14px 28px; display: inline-block; margin-top: 12px; border: 1px solid rgba(255,255,255,0.3);">
                  <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">❌ Booking Cancelled</p>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">

              <!-- English Section -->
              <div style="margin-bottom: 30px;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 15px 0;">Hello ${customerName || 'Valued Guest'},</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Your booking has been cancelled as requested. We hope to see you again soon for your future travel needs.
                </p>
              </div>

              <!-- Cancelled Booking Details -->
              <div style="background: #fef2f2; border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #dc2626;">
                <h3 style="color: #991b1b; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Cancelled Booking Details</h3>
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                    <span style="color: #991b1b; font-weight: 500;">Reservation ID:</span>
                    <span style="color: #7f1d1d; font-weight: 600; font-family: monospace;">${reservationId}</span>
                  </div>
                  ${hotelName ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                    <span style="color: #991b1b; font-weight: 500;">Hotel:</span>
                    <span style="color: #7f1d1d; font-weight: 600;">${hotelName}</span>
                  </div>
                  ` : ''}
                  ${checkInDate ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fecaca;">
                    <span style="color: #991b1b; font-weight: 500;">Check-in Date:</span>
                    <span style="color: #7f1d1d; font-weight: 600;">${formatDate(checkInDate)}</span>
                  </div>
                  ` : ''}
                  ${checkOutDate ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #991b1b; font-weight: 500;">Check-out Date:</span>
                    <span style="color: #7f1d1d; font-weight: 600;">${formatDate(checkOutDate)}</span>
                  </div>
                  ` : ''}
                </div>
              </div>

              ${penalty && penalty.amount > 0 ? `
              <!-- Cancellation Fee -->
              <div style="background: #fef3c7; border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">Cancellation Fee</h3>
                <p style="color: #78350f; font-size: 24px; font-weight: 700; margin: 0;">
                  ${formatCurrency(penalty.showAmount || penalty.amount, penalty.currency)}
                </p>
                <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">
                  This amount has been deducted as per the cancellation policy.
                </p>
              </div>
              ` : ''}

              ${refundAmount ? `
              <!-- Refund Info -->
              <div style="background: #dcfce7; border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #22c55e;">
                <h3 style="color: #166534; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">Refund Amount</h3>
                <p style="color: #14532d; font-size: 24px; font-weight: 700; margin: 0;">
                  ${formatCurrency(refundAmount)}
                </p>
                <p style="color: #166534; font-size: 14px; margin: 10px 0 0 0;">
                  Your refund will be processed within 5-10 business days.
                </p>
              </div>
              ` : ''}

              <!-- Arabic Section -->
              <div style="margin: 30px 0; text-align: right; direction: rtl; border-top: 1px solid #e5e7eb; padding-top: 30px;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 15px 0;">مرحباً ${customerName || 'عزيزنا الضيف'},</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                  تم إلغاء حجزك بناءً على طلبك. نأمل أن نراك مجدداً قريباً لتلبية احتياجات سفرك المستقبلية.
                </p>
              </div>

              <!-- Book Again CTA -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 50px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.4);">
                  🏨 Book Another Stay
                </a>
              </div>

              <!-- Contact Info -->
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                  Questions about your cancellation? Contact us at<br>
                  <a href="mailto:${process.env.EMAIL_FROM}" style="color: #4f46e5; text-decoration: none;">${process.env.EMAIL_FROM}</a>
                </p>
              </div>

            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Gaith Tours. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Cancellation email error:', error);
    throw new Error('Email could not be sent: ' + error.message);
  }
};

// Send invoice email
const sendInvoiceEmail = async (invoiceData) => {
  try {
    const transporter = createTransporter();
    const { email, name, invoice, booking } = invoiceData;

    // Generate PDF invoices in both languages
    const pdfGenerator = new InvoicePDFGenerator();    const invoiceDataForPDF = {
      // Invoice details
      invoiceId: invoice.invoiceId,
      createdAt: invoice.createdAt,
      paymentStatus: invoice.paymentStatus,
      amount: invoice.amount,
      currency: invoice.currency,

      // Client information (use booking data for complete info)
      clientName: invoice.clientName || booking.touristName,
      clientEmail: invoice.clientEmail || booking.email,
      clientPhone: invoice.clientPhone || booking.phone,
      clientNationality: invoice.clientNationality || booking.nationality,

      // Tourist/Booker details
      touristName: booking.touristName,
      bookerName: booking.touristName, // In case different from clientName
      phone: booking.phone,
      email: booking.email,
      nationality: booking.nationality,
        // Hotel information
      hotelName: booking.hotel.name,
      hotelAddress: booking.hotel.address,
      hotelImage: booking.hotel.image,
      hotel: booking.hotel, // Pass complete hotel object for city/country access

      // Booking details
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      expectedCheckInTime: booking.expectedCheckInTime,
      roomType: booking.roomType,
      stayType: booking.stayType,
      paymentMethod: booking.paymentMethod,
      numberOfGuests: booking.numberOfGuests,
      guests: booking.guests,
      notes: booking.notes
    };

    // Generate PDFs for both languages
    const [englishPDF, arabicPDF] = await Promise.all([
      pdfGenerator.generateInvoicePDF(invoiceDataForPDF, 'en'),
      pdfGenerator.generateInvoicePDF(invoiceDataForPDF, 'ar')
    ]);

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `📄 Invoice #${invoice.invoiceId} - Gaith Tours | فاتورة رقم ${invoice.invoiceId} - غيث تورز`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            * { box-sizing: border-box; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); font-family: 'Plus+Jakarta Sans', sans-serif;">
          <div style="max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">

            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); padding: 45px 30px; text-align: center; position: relative;">
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1);"></div>
              <div style="position: relative; z-index: 1;">
                <div style="margin-bottom: 20px;">
                  <img src="cid:logo" alt="Gaith Tours Logo" style="height: 60px; width: auto;" />
                </div>
                <h1 style="color: #ffffff; font-size: 34px; font-weight: 800; margin: 0 0 12px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Gaith Tours</h1>
                <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50px; padding: 14px 28px; display: inline-block; margin-top: 12px;">
                  <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">📄 Invoice Ready | الفاتورة جاهزة</p>
                </div>
              </div>
            </div>

            <div style="padding: 40px 30px;">
              <!-- English Section -->
              <div style="margin-bottom: 40px;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">Hello ${name}!</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                  Your booking has been approved! Please find your invoice details below and proceed with payment to confirm your reservation. Both English and Arabic versions of your invoice are attached to this email.
                </p>
              </div>

              <!-- Arabic Section -->
              <div style="margin-bottom: 40px; text-align: right; direction: rtl;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">مرحباً ${name}!</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                  تم الموافقة على حجزك! يرجى مراجعة تفاصيل الفاتورة أدناه والمتابعة للدفع لتأكيد حجزك. تم إرفاق النسختين الإنجليزية والعربية من فاتورتك بهذا البريد الإلكتروني.
                </p>
              </div>

              <!-- Invoice Details -->
              <div style="background: #f8fafc; border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #4f46e5;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Invoice Details | تفاصيل الفاتورة</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div>
                    <p style="margin: 8px 0; color: #374151;"><strong>Invoice ID:</strong> ${invoice.invoiceId}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Hotel:</strong> ${invoice.hotelName}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Amount:</strong> ${invoice.amount} ${invoice.currency}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Issue Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div style="text-align: right; direction: rtl;">
                    <p style="margin: 8px 0; color: #374151;"><strong>رقم الفاتورة:</strong> ${invoice.invoiceId}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>الفندق:</strong> ${invoice.hotelName}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>المبلغ:</strong> ${invoice.amount} ${invoice.currency}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>تاريخ الإصدار:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <!-- Call to Action Buttons -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/profile?tab=invoices&invoice=${invoice._id}" style="background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 600; display: inline-block; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3); margin: 10px;">
                  💳 Pay Now (${invoice.amount} ${invoice.currency}) | ادفع الآن
                </a>
                <br>
                <a href="${process.env.FRONTEND_URL}/profile" style="background: #6b7280; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 600; display: inline-block; box-shadow: 0 10px 25px rgba(107, 114, 128, 0.3); margin: 10px;">
                  View Invoice | عرض الفاتورة
                </a>
              </div>

              <!-- Attachments Notice -->
              <div style="background: #e0f2fe; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #0284c7;">
                <p style="color: #0c4a6e; font-size: 14px; margin: 0; text-align: center;">
                  📎 <strong>Attached Files | الملفات المرفقة:</strong><br>
                  • Invoice_${invoice.invoiceId}_English.pdf<br>
                  • Invoice_${invoice.invoiceId}_Arabic.pdf
                </p>
              </div>

              <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 30px 0 0 0;">
                Please log in to your account to view the invoice and make payment.<br>
                <span style="direction: rtl; display: block; margin-top: 5px;">يرجى تسجيل الدخول إلى حسابك لعرض الفاتورة والدفع.</span>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Invoice_${invoice.invoiceId}_English.pdf`,
          content: englishPDF,
          contentType: 'application/pdf'
        },
        {
          filename: `Invoice_${invoice.invoiceId}_Arabic.pdf`,
          content: arabicPDF,
          contentType: 'application/pdf'
        },
        {
          filename: 'logo.svg',
          path: path.join(__dirname, '../public/Group.svg'),
          cid: 'logo'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    throw error;
  }
};

// Send booking denial email
const sendBookingDenialEmail = async (denialData) => {
  try {
    const transporter = createTransporter();
    const { email, name, booking, reason } = denialData;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '❌ Booking Request Update - Gaith Tours',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Update</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            * { box-sizing: border-box; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 45px 30px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 34px; font-weight: 800; margin: 0 0 12px 0;">✈️ Gaith Tours</h1>
              <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50px; padding: 14px 28px; display: inline-block; margin-top: 12px;">
                <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">❌ Booking Update</p>
              </div>
            </div>

            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">Hello ${name}!</h2>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                We regret to inform you that your booking request for ${booking.hotel.name} has been declined.
              </p>

              <div style="background: #fef2f2; border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #ef4444;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Reason</h3>
                <p style="color: #374151; margin: 0;">${reason}</p>
              </div>

              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 25px 0;">
                Don't worry! You can browse our other available hotels and submit a new booking request. Our team is here to help you find the perfect accommodation.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/hotels" style="background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 600; display: inline-block; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3);">
                  Browse Hotels
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send booking denial email:', error);
    throw error;
  }
};

// Send booking confirmation email (when payment is completed)
const sendBookingConfirmationEmail = async (confirmationData) => {
  try {
    const transporter = createTransporter();
    const { email, name, booking, invoice } = confirmationData;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '🎉 Booking Confirmed - Gaith Tours',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmed</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            * { box-sizing: border-box; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 45px 30px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 34px; font-weight: 800; margin: 0 0 12px 0;">✈️ Gaith Tours</h1>
              <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50px; padding: 14px 28px; display: inline-block; margin-top: 12px;">
                <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">🎉 Booking Confirmed!</p>
              </div>
            </div>

            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">Congratulations ${name}!</h2>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Your payment has been successfully processed and your booking is now confirmed!
              </p>

              <div style="background: #f0fdf4; border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Booking Details</h3>
                <p style="margin: 8px 0; color: #374151;"><strong>Hotel:</strong> ${booking.hotel.name}</p>
                <p style="margin: 8px 0; color: #374151;"><strong>Address:</strong> ${booking.hotel.address}</p>
                <p style="margin: 8px 0; color: #374151;"><strong>Invoice ID:</strong> ${invoice.invoiceId}</p>
                <p style="margin: 8px 0; color: #374151;"><strong>Amount Paid:</strong> ${invoice.amount} ${invoice.currency}</p>
              </div>

              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 25px 0;">
                You will receive your booking confirmation details soon. Have a wonderful trip!
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/profile" style="background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 600; display: inline-block; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3);">
                  View Booking
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    throw error;
  }
};

// Send payment confirmation email
const sendPaymentConfirmationEmail = async (paymentData) => {
  try {
    const transporter = createTransporter();
    const { email, name, invoice, payment } = paymentData;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `💳 Payment Confirmed - Invoice #${invoice.invoiceId} - Gaith Tours`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmation</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            * { box-sizing: border-box; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #10b981 0%, #059669 100%); font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 45px 30px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 34px; font-weight: 800; margin: 0 0 12px 0;">✈️ Gaith Tours</h1>
              <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50px; padding: 14px 28px; display: inline-block; margin-top: 12px;">
                <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">💳 Payment Confirmed</p>
              </div>
            </div>

            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">Hello ${name}!</h2>

              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Great news! Your payment has been successfully processed and your booking is now confirmed!
              </p>

              <div style="background: #f0fdf4; border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Payment Details</h3>
                <p style="margin: 8px 0; color: #374151;"><strong>Invoice ID:</strong> ${invoice.invoiceId}</p>
                <p style="margin: 8px 0; color: #374151;"><strong>Hotel:</strong> ${invoice.hotelName}</p>
                <p style="margin: 8px 0; color: #374151;"><strong>Amount Paid:</strong> ${invoice.amount} ${invoice.currency}</p>
                <p style="margin: 8px 0; color: #374151;"><strong>Payment Date:</strong> ${new Date(payment.processedAt).toLocaleDateString()}</p>
                <p style="margin: 8px 0; color: #374151;"><strong>Transaction ID:</strong> ${payment.transactionId}</p>
              </div>

              <div style="background: #fef3c7; border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Next Steps</h3>
                <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                  <li>You will receive your booking confirmation details within 24 hours</li>
                  <li>Our team will contact you for any additional arrangements</li>
                  <li>Please keep this payment confirmation for your records</li>
                  <li>Check your email for booking vouchers and travel documents</li>
                </ul>
              </div>

              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 25px 0;">
                Thank you for choosing Gaith Tours. We can't wait to make your travel experience unforgettable!
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/profile" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 600; display: inline-block; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);">
                  View My Bookings
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 30px 0 0 0;">
                Need help? Contact us at ${process.env.EMAIL_FROM || process.env.EMAIL_USER}
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
    throw error;
  }
};

// Send email verification email
const sendVerificationEmail = async (userData) => {
  try {
    const transporter = createTransporter();

    const { email, name, verificationToken, verificationUrl } = userData;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '✉️ Verify Your Email - Gaith Tours | تحقق من بريدك الإلكتروني',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            * { box-sizing: border-box; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%); padding: 45px 30px; text-align: center; position: relative;">
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1);"></div>
              <div style="position: relative; z-index: 1;">
                <h1 style="color: #ffffff; font-size: 34px; font-weight: 800; margin: 0 0 12px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">✈️ Gaith Tours</h1>
                <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50px; padding: 14px 28px; display: inline-block; margin-top: 12px; border: 1px solid rgba(255,255,255,0.3);">
                  <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">✉️ Email Verification Required</p>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">

              <!-- English Section -->
              <div style="margin-bottom: 30px;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 15px 0;">Hello ${name}! 👋</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Thank you for registering with Gaith Tours! Please verify your email address by clicking the button below to activate your account and start booking amazing hotels.
                </p>
              </div>

              <!-- Verification Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${verificationUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 50px; font-weight: 700; font-size: 18px; display: inline-block; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;">
                  ✅ Verify My Email
                </a>
              </div>

              <!-- Arabic Section -->
              <div style="margin: 30px 0; text-align: right; direction: rtl; border-top: 1px solid #e5e7eb; padding-top: 30px;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 15px 0;">مرحباً ${name}! 👋</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                  شكراً لتسجيلك في غيث تورز! يرجى التحقق من عنوان بريدك الإلكتروني بالنقر على الزر أعلاه لتفعيل حسابك والبدء في حجز الفنادق الرائعة.
                </p>
              </div>

              <!-- Expiry Notice -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; padding: 20px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center;">
                  ⏰ <strong>This link will expire in 24 hours.</strong><br>
                  <span style="direction: rtl; display: block; margin-top: 5px;">هذا الرابط سينتهي خلال 24 ساعة.</span>
                </p>
              </div>

              <!-- Alternative Link -->
              <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; text-align: center;">
                  If the button doesn't work, copy and paste this link in your browser:
                </p>
                <p style="color: #4f46e5; font-size: 12px; margin: 0; word-break: break-all; text-align: center; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  ${verificationUrl}
                </p>
              </div>

              <!-- Security Notice -->
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                  🔒 If you didn't create an account with Gaith Tours, please ignore this email.<br>
                  <span style="direction: rtl; display: block; margin-top: 5px;">إذا لم تقم بإنشاء حساب في غيث تورز، يرجى تجاهل هذا البريد الإلكتروني.</span>
                </p>
              </div>

            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Gaith Tours. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Verification email error:', error);
    throw new Error('Verification email could not be sent: ' + error.message);
  }
};

// Send sub-admin invitation email
const sendSubAdminInvitation = async (invitationData) => {
  try {
    const transporter = createTransporter();

    const { email, inviterName, permissions, invitationUrl, expiresAt } = invitationData;

    // Format permissions for display
    const permissionLabels = {
      dashboard: '📊 Dashboard Overview',
      clients: '👥 Client Management',
      bookings: '📋 Booking Management',
      payments: '💳 Payment Tracking',
      margins: '💰 Profit Margins',
      whatsapp: '💬 WhatsApp Messages'
    };

    const permissionsList = permissions
      .map(p => permissionLabels[p] || p)
      .join('<br>');

    const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '🎉 You\'ve Been Invited as an Admin - Gaith Tours',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Invitation</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
            * { box-sizing: border-box; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.2);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 45px 30px; text-align: center; position: relative;">
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1);"></div>
              <div style="position: relative; z-index: 1;">
                <h1 style="color: #ffffff; font-size: 34px; font-weight: 800; margin: 0 0 12px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">✈️ Gaith Tours</h1>
                <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 50px; padding: 14px 28px; display: inline-block; margin-top: 12px; border: 1px solid rgba(255,255,255,0.3);">
                  <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">🎉 You're Invited to Join the Admin Team!</p>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <div style="margin-bottom: 30px;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 15px 0;">Hello!</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  <strong style="color: #f97316;">${inviterName}</strong> has invited you to join the Gaith Tours admin team as a Sub-Admin.
                </p>
              </div>

              <!-- Permissions Card -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 16px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #f97316;">
                <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
                  🔐 Your Assigned Permissions
                </h3>
                <p style="color: #64748b; font-size: 14px; margin: 0 0 15px 0;">
                  You will have access to the following areas of the admin dashboard:
                </p>
                <div style="background: #ffffff; border-radius: 12px; padding: 15px; line-height: 2;">
                  ${permissionsList}
                </div>
              </div>

              <!-- Expiration Notice -->
              <div style="background: #fef3c7; border-radius: 16px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
                  ⏰ This invitation expires on <strong>${expiresDate}</strong>
                </p>
              </div>

              <!-- Accept Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${invitationUrl}" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 50px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 30px rgba(249, 115, 22, 0.4);">
                  ✅ Accept Invitation
                </a>
              </div>

              <!-- Alternative Link -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="color: #f97316; font-size: 12px; word-break: break-all; margin: 0; font-family: monospace; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                  ${invitationUrl}
                </p>
              </div>

              <!-- Security Notice -->
              <div style="background: #fee2e2; border-radius: 16px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #ef4444;">
                <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
                  🔒 <strong>Security Notice:</strong> If you didn't expect this invitation, please ignore this email or contact the administrator.
                </p>
              </div>

            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Gaith Tours. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Sub-admin invitation email error:', error);
    throw new Error('Invitation email could not be sent: ' + error.message);
  }
};

module.exports = {
  sendReservationConfirmation,
  sendAgencyNotification,
  sendWelcomeEmail,
  sendCancellationEmail,
  sendInvoiceEmail,
  sendBookingDenialEmail,
  sendBookingConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendVerificationEmail,
  sendSubAdminInvitation
};
