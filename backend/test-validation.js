const mongoose = require('mongoose');
require('dotenv').config();

// Import the Reservation model
const Reservation = require('./models/Reservation');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Test reservation data
const testData = {
  user: '6575e5b49fe7d32d383179b6', // Replace with a valid user ID from your database
  touristName: 'Test User',
  phone: '+1234567890',
  nationality: 'Test Country',
  email: 'test@example.com',
  roomType: 'double',
  stayType: 'bed_breakfast',
  paymentMethod: 'Credit Card',
  hotel: {
    name: 'Test Hotel',
    address: '123 Test Street',
    city: 'Test City',
    country: 'Test Country'
  },
  // This field is likely causing the validation error - try different values
  guests: [
    /* Uncomment and modify different test cases to isolate the issue
    {
      // Test Case 1: Valid guest
      fullName: 'Guest One',
      phoneNumber: '+9876543210'
    },
    {
      // Test Case 2: Missing phone
      fullName: 'Guest Two'
    },
    {
      // Test Case 3: Missing name
      phoneNumber: '+5555555555'
    }
    */
  ],
  checkInDate: new Date(),
  checkOutDate: new Date(Date.now() + 86400000), // Tomorrow
  numberOfGuests: 2
};

// Test the validation
async function testValidation() {
  try {
    console.log('Testing reservation validation with data:', JSON.stringify(testData, null, 2));

    // Create a new reservation instance
    const reservation = new Reservation(testData);

    // Validate but don't save
    await reservation.validate();
    console.log('✅ Validation passed!');

    // If validation passes, you can uncomment to save
    // await reservation.save();
    // console.log('✅ Reservation saved successfully!');
  } catch (error) {
    console.error('❌ Validation failed:');

    if (error.name === 'ValidationError') {
      // Format and print validation errors
      console.error('Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`- ${key}: ${error.errors[key].message}`);
        console.error(`  Value: ${error.errors[key].value}`);
        console.error(`  Type: ${error.errors[key].kind}`);
      });
    } else {
      console.error(error);
    }
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the test
testValidation();
