const fs = require('fs');
const path = require('path');
const { getBookingConfirmationTemplate } = require('../utils/emailTemplates');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Mock data as it would come from payments.js
const mockPaymentData = {
  email: "alex.doe@example.com",
  name: "Alex Doe",
  invoice: {
    invoiceId: "INV-2024-888",
    hotelName: "Grand Plaza Hotel",
    hotelAddress: "123 Main St, Cityville",
    amount: 1250,
    total: 1250,
    currency: "USD",
    clientPhone: "+15550001",
    clientNationality: "US"
  },
  payment: {
    paymentMethod: "visa",
    status: "completed",
    transactionId: "txn_123456789",
    processedAt: new Date()
  },
  booking: {
    _id: "RES-555",
    phone: "+15559999",
    nationality: "Canadian",
    expectedCheckInTime: "14:00",
    roomType: "Deluxe Ocean View",
    stayType: "Half Board",
    paymentMethod: "Credit Card",
    numberOfGuests: 2,
    guests: [
      { fullName: "Alex Doe", phoneNumber: "+15559999" },
      { fullName: "Jane Doe", phoneNumber: "+15558888" }
    ],
    hotel: {
      name: "Grand Plaza Hotel",
      address: "123 Main St, Cityville",
      city: "Cityville",
      country: "Countryland",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      rating: 4.5,
      coordinates: [40.7128, -74.0060]
    },
    checkInDate: "2025-05-10",
    checkOutDate: "2025-05-15",
    notes: "Late check-in requested."
  }
};

try {
  // Logic copied from updated sendPaymentConfirmationEmail in emailService.js
  const { email, name, invoice, payment, booking } = mockPaymentData;

  const templateData = {
      reservation: booking || {},
      touristName: name,
      email: email,
      phone: booking ? booking.phone : (invoice.clientPhone || ''),
      nationality: booking ? booking.nationality : (invoice.clientNationality || ''),
      expectedCheckInTime: booking ? booking.expectedCheckInTime : '',
      roomType: booking ? booking.roomType : 'Standard Room',
      stayType: booking ? booking.stayType : '',
      paymentMethod: payment ? payment.paymentMethod : 'Credit Card',
      numberOfGuests: booking ? booking.numberOfGuests : 1,
      guests: booking ? booking.guests : [],
      hotel: booking ? booking.hotel : { name: invoice.hotelName, address: invoice.hotelAddress },
      checkInDate: booking ? booking.checkInDate : null,
      checkOutDate: booking ? booking.checkOutDate : null,
      notes: booking ? booking.notes : '',
      totalAmount: invoice.amount || invoice.total,
      taxes: 0
  };

  const html = getBookingConfirmationTemplate(templateData);
  const outputPath = path.join(__dirname, '../temp/preview-payment-email-final.html');

  if (!fs.existsSync(path.join(__dirname, '../temp'))) {
    fs.mkdirSync(path.join(__dirname, '../temp'));
  }

  fs.writeFileSync(outputPath, html);
  console.log(`Preview generated at: ${outputPath}`);
} catch (error) {
  console.error('Error generating preview:', error);
}
