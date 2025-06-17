const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.baseUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }
  /**
   * Send a WhatsApp message using Meta's Cloud API
   * @param {string} to - Recipient phone number (with country code, no + sign)
   * @param {string} message - Message text
   * @returns {Promise<Object>} API response
   */
  async sendMessage(to, message) {
    try {
      // Check if credentials are available
      if (!this.accessToken) {
        throw new Error('WhatsApp access token is not configured');
      }
      if (!this.phoneNumberId) {
        throw new Error('WhatsApp phone number ID is not configured');
      }

      // Format phone number - remove any non-numeric characters except country code
      const formattedPhone = to.replace(/[^\d]/g, '');

      const data = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      };

      console.log('Sending WhatsApp message to:', formattedPhone);
      console.log('Using phone number ID:', this.phoneNumberId);

      const response = await axios.post(this.baseUrl, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('WhatsApp message sent successfully:', response.data);
      return response.data;    } catch (error) {
      if (error.response?.data?.error?.code === 133010) {
        console.error('❌ WhatsApp Account Error: Account is not registered with Meta Cloud API');
        console.error('🔧 Setup Required: Visit developers.facebook.com → WhatsApp → Complete business verification');
      } else {
        console.error('WhatsApp message error:', error.response?.data || error.message);
      }
      throw error;
    }
  }

  /**
   * Send booking approval notification
   * @param {Object} booking - Booking details
   * @param {Object} invoice - Invoice details
   */  async sendBookingApprovalNotification(booking, invoice) {
    try {
      // Check if WhatsApp is properly configured
      if (!this.accessToken || !this.phoneNumberId) {
        console.warn('WhatsApp not configured - skipping notification');
        return;
      }

      const message = this.formatBookingApprovalMessage(booking, invoice);

      // Extract phone number from booking
      let phoneNumber = booking.phone;

      // If phone doesn't start with country code, assume Saudi Arabia (+966)
      if (!phoneNumber.startsWith('966') && !phoneNumber.startsWith('+966')) {
        phoneNumber = phoneNumber.startsWith('0') ?
          `966${phoneNumber.substring(1)}` :
          `966${phoneNumber}`;
      }

      await this.sendMessage(phoneNumber, message);
      console.log(`Booking approval WhatsApp sent to ${phoneNumber}`);
    } catch (error) {
      // Check if it's the "account not registered" error
      if (error.response?.data?.error?.code === 133010) {
        console.error('❌ WhatsApp Business Account NOT REGISTERED with Meta Cloud API');
        console.error('🔧 ACTION REQUIRED: Go to developers.facebook.com and complete WhatsApp Business setup');
      } else {
        console.error('Failed to send booking approval WhatsApp:', error.response?.data || error.message);
      }
      // Don't throw error to avoid breaking the booking approval process
    }
  }
  /**
   * Format booking approval message
   * @param {Object} booking - Booking details
   * @param {Object} invoice - Invoice details
   * @returns {string} Formatted message
   */
  formatBookingApprovalMessage(booking, invoice) {
    // Handle date formatting safely
    let checkInDate = 'Not specified';
    let checkOutDate = 'Not specified';
    let duration = 'Not specified';

    if (booking.checkInDate) {
      checkInDate = new Date(booking.checkInDate).toLocaleDateString('en-GB');
    }

    if (booking.checkOutDate) {
      checkOutDate = new Date(booking.checkOutDate).toLocaleDateString('en-GB');
    }

    // Calculate duration if both dates are available
    if (booking.checkInDate && booking.checkOutDate) {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const timeDiff = checkOut.getTime() - checkIn.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      duration = daysDiff > 0 ? `${daysDiff}` : 'Not specified';
    }

    return `🎉 *Booking Approved - Gaith Tours*

Dear ${booking.touristName},

Great news! Your booking request has been approved.

📋 *Booking Details:*
• Hotel: ${booking.hotel.name}
• Check-in: ${checkInDate}
• Check-out: ${checkOutDate}
• Duration: ${duration} nights
• Guests: ${booking.numberOfGuests || 1} guests

💰 *Invoice Information:*
• Invoice ID: ${invoice.invoiceId}
• Amount: ${invoice.amount} SAR

📧 You will receive a detailed invoice via email shortly.

For any questions, please contact us:
📞 Phone: +966 XX XXX XXXX
📧 Email: info@gaithtours.com

Thank you for choosing Gaith Tours! 🌟`;
  }

  /**
   * Send payment reminder notification
   * @param {Object} booking - Booking details
   * @param {Object} invoice - Invoice details
   */
  async sendPaymentReminder(booking, invoice) {
    try {
      const message = `💳 *Payment Reminder - Gaith Tours*

Dear ${booking.touristName},

This is a friendly reminder about your pending payment.

📋 *Invoice Details:*
• Invoice ID: ${invoice.invoiceId}
• Amount: ${invoice.amount} SAR
• Hotel: ${booking.hotel.name}

Please complete your payment to confirm your reservation.

Contact us for payment assistance:
📞 Phone: +966 XX XXX XXXX

Thank you!`;

      let phoneNumber = booking.phone;
      if (!phoneNumber.startsWith('966') && !phoneNumber.startsWith('+966')) {
        phoneNumber = phoneNumber.startsWith('0') ?
          `966${phoneNumber.substring(1)}` :
          `966${phoneNumber}`;
      }

      await this.sendMessage(phoneNumber, message);
      console.log(`Payment reminder WhatsApp sent to ${phoneNumber}`);
    } catch (error) {
      console.error('Failed to send payment reminder WhatsApp:', error);
    }
  }

  /**
   * Send booking confirmation after payment
   * @param {Object} booking - Booking details
   * @param {Object} payment - Payment details
   */
  async sendBookingConfirmation(booking, payment) {
    try {
      const checkInDate = new Date(booking.checkIn).toLocaleDateString('en-GB');
      const checkOutDate = new Date(booking.checkOut).toLocaleDateString('en-GB');

      const message = `✅ *Booking Confirmed - Gaith Tours*

Dear ${booking.touristName},

Your payment has been received and your booking is now confirmed!

📋 *Confirmed Booking:*
• Hotel: ${booking.hotel.name}
• Check-in: ${checkInDate}
• Check-out: ${checkOutDate}
• Duration: ${booking.duration} nights
• Guests: ${booking.adults} adults${booking.children ? `, ${booking.children} children` : ''}

💳 *Payment Confirmed:*
• Amount: ${payment.amount} SAR
• Payment ID: ${payment.paymentId || payment._id}

📧 Confirmation email with all details has been sent.

Have a wonderful trip! 🌟

Gaith Tours Team`;

      let phoneNumber = booking.phone;
      if (!phoneNumber.startsWith('966') && !phoneNumber.startsWith('+966')) {
        phoneNumber = phoneNumber.startsWith('0') ?
          `966${phoneNumber.substring(1)}` :
          `966${phoneNumber}`;
      }

      await this.sendMessage(phoneNumber, message);
      console.log(`Booking confirmation WhatsApp sent to ${phoneNumber}`);
    } catch (error) {
      console.error('Failed to send booking confirmation WhatsApp:', error);
    }
  }

  /**
   * Send booking denial notification
   * @param {Object} booking - Booking details
   * @param {string} reason - Denial reason
   */
  async sendBookingDenialNotification(booking, reason) {
    try {
      const message = `❌ *Booking Update - Gaith Tours*

Dear ${booking.touristName},

We regret to inform you that your booking request has been denied.

📋 *Booking Details:*
• Hotel: ${booking.hotel.name}
• Check-in: ${new Date(booking.checkIn).toLocaleDateString('en-GB')}
• Check-out: ${new Date(booking.checkOut).toLocaleDateString('en-GB')}

📝 *Reason:*
${reason}

We apologize for any inconvenience. Please feel free to submit a new booking request or contact us for alternative options.

📞 Contact us: +966 XX XXX XXXX
📧 Email: info@gaithtours.com

Thank you for your understanding.
Gaith Tours Team`;

      let phoneNumber = booking.phone;
      if (!phoneNumber.startsWith('966') && !phoneNumber.startsWith('+966')) {
        phoneNumber = phoneNumber.startsWith('0') ?
          `966${phoneNumber.substring(1)}` :
          `966${phoneNumber}`;
      }

      await this.sendMessage(phoneNumber, message);
      console.log(`Booking denial WhatsApp sent to ${phoneNumber}`);
    } catch (error) {
      console.error('Failed to send booking denial WhatsApp:', error);
    }
  }
}

module.exports = new WhatsAppService();
