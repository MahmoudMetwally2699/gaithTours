const fs = require('fs');
const path = require('path');
const { getBookingConfirmationTemplate } = require('../utils/emailTemplates');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mockConfirmationData = {
  name: "Sarah Williams",
  email: "sarah.w@example.com",
  booking: {
    _id: "TRV-998877",
    phone: "+1987654321",
    nationality: "UK",
    expectedCheckInTime: "15:00",
    roomType: "Executive Suite",
    stayType: "Half Board",
    paymentMethod: "Visa",
    numberOfGuests: 3,
    guests: [
        { fullName: "John Williams", phoneNumber: "+1987654322" },
        { fullName: "Emily Williams", phoneNumber: "+1987654323" }
    ],
    hotel: {
      name: "Sapphire Bay Resort",
      address: "45 Ocean Dr",
      city: "Dubai",
      country: "UAE",
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      rating: 5.0,
      price: 550,
      coordinates: [25.276987, 55.296249]
    },
    checkInDate: "2024-11-20",
    checkOutDate: "2024-11-25",
    notes: "Allergies to peanuts."
  },
  invoice: {
    invoiceId: "INV-2024-001",
    amount: 1650,
    currency: "USD",
    createdAt: new Date().toISOString()
  }
};

try {
    // Simulate the data mapping done in sendBookingConfirmationEmail
    const templateData = {
      reservation: mockConfirmationData.booking,
      touristName: mockConfirmationData.name,
      email: mockConfirmationData.email,
      phone: mockConfirmationData.booking.phone,
      nationality: mockConfirmationData.booking.nationality,
      expectedCheckInTime: mockConfirmationData.booking.expectedCheckInTime,
      roomType: mockConfirmationData.booking.roomType,
      stayType: mockConfirmationData.booking.stayType,
      paymentMethod: mockConfirmationData.booking.paymentMethod,
      numberOfGuests: mockConfirmationData.booking.numberOfGuests,
      guests: mockConfirmationData.booking.guests,
      hotel: mockConfirmationData.booking.hotel,
      checkInDate: mockConfirmationData.booking.checkInDate,
      checkOutDate: mockConfirmationData.booking.checkOutDate,
      notes: mockConfirmationData.booking.notes,
      totalAmount: mockConfirmationData.invoice.amount,
      taxes: 0 // Optional
    };

  const html = getBookingConfirmationTemplate(templateData);
  const outputPath = path.join(__dirname, '../temp/preview-payment-confirmation.html');

  // Ensure temp dir exists
  if (!fs.existsSync(path.join(__dirname, '../temp'))) {
    fs.mkdirSync(path.join(__dirname, '../temp'));
  }

  fs.writeFileSync(outputPath, html);
  console.log(`Preview generated at: ${outputPath}`);
} catch (error) {
  console.error('Error generating preview:', error);
}
