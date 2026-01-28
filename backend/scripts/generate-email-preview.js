const fs = require('fs');
const path = require('path');
const { getBookingConfirmationTemplate } = require('../utils/emailTemplates');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mockReservationData = {
  reservation: {
    _id: "TRV-882910"
  },
  touristName: "Alex Johnson",
  email: "alex.johnson@example.com",
  phone: "+1234567890",
  nationality: "US",
  expectedCheckInTime: "14:00",
  roomType: "Deluxe King Suite (City View)",
  stayType: "All Inclusive",
  paymentMethod: "Credit Card",
  numberOfGuests: 2,
  guests: [],
  hotel: {
    name: "Grand Plaza Hotel & Spa",
    address: "123 Elegant Way",
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    rating: 4.8,
    price: 280,
    coordinates: [48.8566, 2.3522] // Approximated Paris coords
  },
  checkInDate: "2024-10-14",
  checkOutDate: "2024-10-17",
  notes: "Late check-in requested.",
  totalAmount: 952.50,
  taxes: 112.50
};

try {
  const html = getBookingConfirmationTemplate(mockReservationData);
  const outputPath = path.join(__dirname, '../temp/preview-email.html');

  // Ensure temp dir exists
  if (!fs.existsSync(path.join(__dirname, '../temp'))) {
    fs.mkdirSync(path.join(__dirname, '../temp'));
  }

  fs.writeFileSync(outputPath, html);
  console.log(`Preview generated at: ${outputPath}`);
} catch (error) {
  console.error('Error generating preview:', error);
}
