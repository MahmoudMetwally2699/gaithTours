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


      const response = await axios.post(this.baseUrl, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
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
   * Send a WhatsApp media message using Meta's Cloud API
   * @param {string} to - Recipient phone number (with country code, no + sign)
   * @param {string} mediaUrl - URL of the media file
   * @param {string} mediaType - Type of media (image, document, audio, video)
   * @param {string} caption - Optional caption for the media
   * @param {string} filename - Optional filename for documents
   * @returns {Promise<Object>} API response
   */
  async sendMediaMessage(to, mediaUrl, mediaType, caption = '', filename = '') {
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

      let data = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: mediaType
      };

      // Configure data based on media type
      switch (mediaType) {
        case 'image':
          data.image = {
            link: mediaUrl,
            caption: caption
          };
          break;        case 'document':
          data.document = {
            link: mediaUrl,
            caption: caption,
            filename: filename || 'document'
          };

          break;
        case 'audio':
          data.audio = {
            link: mediaUrl
          };
          break;
        case 'video':
          data.video = {
            link: mediaUrl,
            caption: caption
          };
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }



      const response = await axios.post(this.baseUrl, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('WhatsApp media message error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send booking approval notification using Arabic template
   * @param {Object} booking - Booking details
   * @param {Object} invoice - Invoice details
   */
  async sendBookingApprovalNotification(booking, invoice) {
    return this.sendBookingApprovalNotificationArabic(booking, invoice);
  }  /**
   * Send payment reminder notification using Arabic template
   * @param {Object} booking - Booking details
   * @param {Object} invoice - Invoice details
   */
  async sendPaymentReminder(booking, invoice) {
    return this.sendPaymentReminderArabic(booking, invoice);
  }
  /**
   * Send booking confirmation using Arabic template
   * @param {Object} booking - Booking details
   * @param {Object} payment - Payment details
   */
  async sendBookingConfirmation(booking, payment) {
    return this.sendBookingConfirmationArabic(booking, payment);
  }
  /**
   * Send booking denial notification using Arabic template
   * @param {Object} booking - Booking details
   * @param {string} reason - Denial reason
   */
  async sendBookingDenialNotification(booking, reason) {
    return this.sendBookingDenialNotificationArabic(booking, reason);
  }

  /**
   * Send phone verification OTP code via WhatsApp
   * @param {string} phone - Phone number with country code
   * @param {string} code - 6-digit verification code
   * @param {string} language - Language preference ('en' or 'ar')
   * @returns {Promise<Object>} API response
   */
  async sendVerificationCode(phone, code, language = 'ar') {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('WhatsApp credentials not configured');
      }

      // Format phone number - remove + and any non-numeric characters
      const formattedPhone = phone.replace(/[^\d]/g, '');

      // Format code with LTR mark to ensure correct direction (Left-to-Right)
      // but KEEP IT COMPACT (no spaces) as requested: 123456
      const formattedCode = '\u202A' + code + '\u202C';

      console.log(`📱 Sending verification code to ${formattedPhone} using template`);

      // Use the verfications_code template with the formatted code parameter
      const data = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'verfications_code',  // Your approved template name
          language: {
            code: 'en'  // Template language
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: formattedCode  // Use LTR-marked code so it doesn't reverse
                }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.baseUrl, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📋 WhatsApp API Response:', JSON.stringify(response.data, null, 2));
      console.log(`✅ Verification code sent successfully to ${formattedPhone}`);

      return response.data;
    } catch (error) {
      console.error('❌ Failed to send verification code:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send Arabic booking approval notification using template
   * @param {Object} booking - Booking details
   * @param {Object} invoice - Invoice details
   */
  async sendBookingApprovalNotificationArabic(booking, invoice) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        console.warn('WhatsApp not configured - skipping Arabic notification');
        return;
      }

      const phoneNumber = this.formatPhoneNumber(booking.phone);

      // Calculate duration
      const duration = this.calculateDuration(booking.checkInDate, booking.checkOutDate);

      const templateData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'booking_approval_ar',
          language: {
            code: 'ar'
          },
          components: [            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'customer_name', text: booking.touristName || 'عميل كريم' },
                { type: 'text', parameter_name: 'hotel_name', text: booking.hotel?.name || 'الفندق' },
                { type: 'text', parameter_name: 'check_in_date', text: this.formatDateArabic(booking.checkInDate) },
                { type: 'text', parameter_name: 'check_out_date', text: this.formatDateArabic(booking.checkOutDate) },
                { type: 'text', parameter_name: 'duration', text: duration.toString() },
                { type: 'text', parameter_name: 'guest_count', text: (booking.numberOfGuests || 1).toString() },
                { type: 'text', parameter_name: 'invoice_id', text: invoice.invoiceId || 'N/A' },
                { type: 'text', parameter_name: 'amount', text: invoice.amount?.toString() || '0' }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.baseUrl, templateData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      this.handleWhatsAppError(error, 'Arabic booking approval');
    }
  }

  /**
   * Send Arabic payment reminder using template
   * @param {Object} booking - Booking details
   * @param {Object} invoice - Invoice details
   */
  async sendPaymentReminderArabic(booking, invoice) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        console.warn('WhatsApp not configured - skipping Arabic payment reminder');
        return;
      }

      const phoneNumber = this.formatPhoneNumber(booking.phone);      const templateData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'payment_reminder_ar',
          language: {
            code: 'ar'
          },
          components: [            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'customer_name', text: booking.touristName || 'عميل كريم' },
                { type: 'text', parameter_name: 'invoice_id', text: invoice.invoiceId || 'N/A' },
                { type: 'text', parameter_name: 'amount', text: invoice.amount?.toString() || '0' },
                { type: 'text', parameter_name: 'hotel_name', text: booking.hotel?.name || 'الفندق' }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.baseUrl, templateData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      this.handleWhatsAppError(error, 'Arabic payment reminder');
    }
  }

  /**
   * Send Arabic booking confirmation using template
   * @param {Object} booking - Booking details
   * @param {Object} payment - Payment details
   */
  async sendBookingConfirmationArabic(booking, payment) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        console.warn('WhatsApp not configured - skipping Arabic booking confirmation');
        return;
      }      const phoneNumber = this.formatPhoneNumber(booking.phone);
      const duration = this.calculateDuration(booking.checkInDate, booking.checkOutDate);
      const childrenInfo = booking.children ? `, ${booking.children} أطفال` : ' ';

      const templateData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'booking_confirmation_ar',
          language: {
            code: 'ar'
          },
          components: [            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'customer_name', text: booking.touristName || 'عميل كريم' },
                { type: 'text', parameter_name: 'hotel_name', text: booking.hotel?.name || 'الفندق' },
                { type: 'text', parameter_name: 'check_in_date', text: this.formatDateArabic(booking.checkInDate) },
                { type: 'text', parameter_name: 'check_out_date', text: this.formatDateArabic(booking.checkOutDate) },
                { type: 'text', parameter_name: 'duration', text: duration.toString() },
                { type: 'text', parameter_name: 'guest_count', text: (booking.adults || booking.numberOfGuests || 1).toString() },
                { type: 'text', parameter_name: 'children_info', text: childrenInfo },
                { type: 'text', parameter_name: 'amount', text: payment.amount?.toString() || '0' },
                { type: 'text', parameter_name: 'payment_id', text: payment.paymentId || payment._id || 'N/A' }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.baseUrl, templateData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      this.handleWhatsAppError(error, 'Arabic booking confirmation');
    }
  }

  /**
   * Send Arabic booking denial using template
   * @param {Object} booking - Booking details
   * @param {string} reason - Denial reason
   */
  async sendBookingDenialNotificationArabic(booking, reason) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        console.warn('WhatsApp not configured - skipping Arabic booking denial');
        return;
      }

      const phoneNumber = this.formatPhoneNumber(booking.phone);

      const templateData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'booking_denial_ar',
          language: {
            code: 'ar'
          },
          components: [            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'customer_name', text: booking.touristName || 'عميل كريم' },
                { type: 'text', parameter_name: 'hotel_name', text: booking.hotel?.name || 'الفندق' },
                { type: 'text', parameter_name: 'check_in_date', text: this.formatDateArabic(booking.checkInDate) },
                { type: 'text', parameter_name: 'check_out_date', text: this.formatDateArabic(booking.checkOutDate) },
                { type: 'text', parameter_name: 'denial_reason', text: reason || 'غير محدد' }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.baseUrl, templateData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      this.handleWhatsAppError(error, 'Arabic booking denial');
    }
  }
  /**
   * Helper method to format phone number
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove any non-numeric characters
    let phoneNumber = phone.replace(/[^\d]/g, '');

    // Remove leading + if present
    if (phoneNumber.startsWith('+')) {
      phoneNumber = phoneNumber.substring(1);
    }

    // If number already has a country code (starts with common country codes), use as is
    if (phoneNumber.startsWith('966') || // Saudi Arabia
        phoneNumber.startsWith('20') ||  // Egypt
        phoneNumber.startsWith('971') || // UAE
        phoneNumber.startsWith('965') || // Kuwait
        phoneNumber.startsWith('973') || // Bahrain
        phoneNumber.startsWith('974') || // Qatar
        phoneNumber.startsWith('968') || // Oman
        phoneNumber.startsWith('1') ||   // US/Canada
        phoneNumber.startsWith('44') ||  // UK
        phoneNumber.length > 10) {       // Likely international number
      return phoneNumber;
    }

    // If it's a Saudi local number (starts with 5 and 9 digits) or starts with 0
    if (phoneNumber.startsWith('0')) {
      return `966${phoneNumber.substring(1)}`;
    } else if (phoneNumber.startsWith('5') && phoneNumber.length === 9) {
      return `966${phoneNumber}`;
    }

    // Default: assume it's already formatted correctly
    return phoneNumber;
  }

  /**
   * Helper method to calculate duration between dates
   * @param {string} checkIn - Check-in date
   * @param {string} checkOut - Check-out date
   * @returns {number} Duration in nights
   */
  calculateDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Helper method to format date in Arabic locale
   * @param {string} dateString - Date string
   * @returns {string} Formatted date
   */
  formatDateArabic(dateString) {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-SA');
  }

  /**
   * Helper method to handle WhatsApp errors
   * @param {Object} error - Error object
   * @param {string} context - Context of the error
   */
  handleWhatsAppError(error, context) {
    if (error.response?.data?.error?.code === 133010) {
      console.error(`❌ WhatsApp Account Error (${context}): Account is not registered with Meta Cloud API`);
      console.error('🔧 Setup Required: Visit developers.facebook.com → WhatsApp → Complete business verification');
    } else if (error.response?.data?.error?.code === 131056) {
      console.error(`❌ Template Error (${context}): Message template may not be approved`);
    } else {
      console.error(`WhatsApp ${context} error:`, error.response?.data || error.message);
    }
    // Don't throw error to avoid breaking the process
  }
}

module.exports = new WhatsAppService();
