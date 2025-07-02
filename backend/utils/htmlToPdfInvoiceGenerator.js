const htmlPdf = require('html-pdf');
const path = require('path');
const fs = require('fs');

/**
 * HTML-to-PDF Invoice Generator with perfect Arabic support
 * Uses html-pdf library with web fonts for proper Arabic rendering
 */
class HTMLToPDFInvoiceGenerator {  constructor() {
    this.primaryColor = '#00BFFF'; // Sky blue
    this.accentColor = '#ff6b35'; // Orange
    this.logoPath = path.join(__dirname, '..', 'public', 'Group.svg');
  }

  /**
   * Get company logo as base64 string
   * @returns {string} Base64 encoded logo
   */
  getLogoBase64() {
    try {
      if (fs.existsSync(this.logoPath)) {
        const logoBuffer = fs.readFileSync(this.logoPath);
        return logoBuffer.toString('base64');
      }
    } catch (error) {
      console.warn('⚠️ Could not load company logo:', error.message);
    }
    return ''; // Return empty string if logo cannot be loaded
  }

  /**
   * Generate HTML template for invoice
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @returns {string} HTML template
   */
  generateHTMLTemplate(invoiceData, language = 'en') {
    const isArabic = language === 'ar';
    const direction = isArabic ? 'rtl' : 'ltr';
    const textAlign = isArabic ? 'right' : 'left';    // Translations
    const t = {
      en: {
        companyName: 'Gaith Tours - Travel & Tourism Company',
        invoice: 'INVOICE',
        invoiceInfo: 'Invoice Information',
        invoiceNumber: 'Invoice Number',
        issueDate: 'Issue Date',
        dueDate: 'Due Date',
        paymentStatus: 'Payment Status',
        clientInfo: 'Client Information',
        fullName: 'Full Name',
        bookerName: 'Booked by',
        nationality: 'Nationality',
        phone: 'Phone Number',
        email: 'Email Address',
        bookingDetails: 'Booking Details',        hotelName: 'Hotel Name',
        hotelAddress: 'Hotel Address',
        hotelCity: 'City',
        hotelCountry: 'Country',
        roomType: 'Room Type',
        stayType: 'Stay Type',
        checkIn: 'Check-in Date',
        checkOut: 'Check-out Date',
        checkInTime: 'Expected Check-in Time',
        nights: 'Number of Nights',
        numberOfRooms: 'Number of Rooms',
        numberOfGuests: 'Number of Guests',
        guestDetails: 'Guest Details',
        paymentMethod: 'Payment Method',
        specialRequests: 'Special Requests',
        notes: 'Additional Notes',
        paymentDetails: 'Payment Details',
        totalAmount: 'Total Amount',
        currency: 'SAR',
        thankYou: 'Thank you for choosing our services',
        wishYou: 'We wish you a pleasant and safe stay',
        paid: 'PAID',
        unpaid: 'UNPAID',
        pending: 'PENDING',
        confirmed: 'CONFIRMED',
        cancelled: 'CANCELLED',
        completed: 'COMPLETED',
        leisure: 'Leisure',
        business: 'Business',
        standard: 'Standard Room',
        deluxe: 'Deluxe Room',
        suite: 'Suite',
        family: 'Family Room'
      },
      ar: {
        companyName: 'شركة غيث تورز للسياحة والسفر',
        invoice: 'فاتورة',
        invoiceInfo: 'معلومات الفاتورة',
        invoiceNumber: 'رقم الفاتورة',
        issueDate: 'تاريخ الإصدار',
        dueDate: 'تاريخ الاستحقاق',
        paymentStatus: 'حالة الدفع',
        clientInfo: 'معلومات العميل',
        fullName: 'الاسم الكامل',
        bookerName: 'تم الحجز بواسطة',
        nationality: 'الجنسية',
        phone: 'رقم الهاتف',
        email: 'البريد الإلكتروني',
        bookingDetails: 'تفاصيل الحجز',        hotelName: 'اسم الفندق',
        hotelAddress: 'عنوان الفندق',
        hotelCity: 'المدينة',
        hotelCountry: 'البلد',
        roomType: 'نوع الغرفة',
        stayType: 'نوع الإقامة',
        checkIn: 'تاريخ الوصول',
        checkOut: 'تاريخ المغادرة',
        checkInTime: 'وقت الوصول المتوقع',
        nights: 'عدد الليالي',
        numberOfRooms: 'عدد الغرف',
        numberOfGuests: 'عدد النزلاء',
        guestDetails: 'تفاصيل النزلاء',
        paymentMethod: 'طريقة الدفع',
        specialRequests: 'طلبات خاصة',
        notes: 'ملاحظات إضافية',
        paymentDetails: 'تفاصيل الدفع',
        totalAmount: 'إجمالي المبلغ',
        currency: 'ريال سعودي',
        thankYou: 'شكراً لكم لاختيار خدماتنا',
        wishYou: 'نتمنى لكم إقامة ممتعة وآمنة',
        paid: 'مدفوعة',
        unpaid: 'غير مدفوعة',
        pending: 'في الانتظار',
        confirmed: 'مؤكدة',
        cancelled: 'ملغية',
        completed: 'مكتملة',
        leisure: 'ترفيهية',
        business: 'عمل',
        standard: 'غرفة عادية',
        deluxe: 'غرفة فاخرة',
        suite: 'جناح',
        family: 'غرفة عائلية'
      }
    };

    const trans = t[language];

    // Format dates
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return isArabic
        ? date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
        : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };    // Get payment status display
    const getPaymentStatusDisplay = (status) => {
      switch(status?.toLowerCase()) {
        case 'paid': return trans.paid;
        case 'unpaid': return trans.unpaid;
        case 'pending': return trans.pending;
        case 'confirmed': return trans.confirmed;
        case 'cancelled': return trans.cancelled;
        case 'completed': return trans.completed;
        default: return trans.pending;
      }
    };

    // Translate values
    const translateValue = (key, value) => {
      if (!value) return '';

      const translations = {
        stayType: {
          'Leisure': trans.leisure,
          'Business': trans.business
        },
        roomType: {
          'Standard Room': trans.standard,
          'Deluxe Room': trans.deluxe,
          'Suite': trans.suite,
          'Family Room': trans.family
        }
      };

      return translations[key]?.[value] || value;
    };

    // Calculate number of nights
    const calculateNights = (checkIn, checkOut) => {
      if (!checkIn || !checkOut) return null;
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    // Generate hotel image HTML
    const getHotelImageHTML = () => {
      if (!invoiceData.hotelImage) return '';

      return `
        <div class="hotel-image-container">
          <img src="${invoiceData.hotelImage}" alt="${invoiceData.hotelName}" class="hotel-image" />
        </div>
      `;
    };

    // Generate company logo HTML
    const getCompanyLogoHTML = () => {
      return `
        <div class="company-logo">
          <img src="data:image/svg+xml;base64,${this.getLogoBase64()}" alt="Gaith Tours Logo" class="logo" />
        </div>
      `;
    };

    // Generate guest details HTML
    const getGuestDetailsHTML = () => {
      if (!invoiceData.guests || invoiceData.guests.length === 0) return '';

      return invoiceData.guests.map((guest, index) => `
        <div class="guest-item">
          <div class="guest-number">Guest ${index + 1}:</div>
          <div class="guest-info">
            <div class="guest-name">${guest.fullName}</div>
            <div class="guest-phone">${guest.phoneNumber}</div>
          </div>
        </div>
      `).join('');
    };

    const nights = calculateNights(invoiceData.checkInDate, invoiceData.checkOutDate);

    return `
    <!DOCTYPE html>
    <html lang="${language}" dir="${direction}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${trans.invoice} - ${invoiceData.invoiceId}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: ${isArabic ? "'Noto Sans Arabic', Arial, sans-serif" : "'Inter', Arial, sans-serif"};
                direction: ${direction};
                line-height: 1.6;
                color: #333;
                background: #fff;
                font-size: 14px;
            }

            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 30px;
                background: white;
            }

            .header {
                background: linear-gradient(135deg, ${this.primaryColor}, #0080ff);
                color: white;
                padding: 30px;
                text-align: center;
                margin-bottom: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0, 191, 255, 0.2);
            }

            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
            }

            .header .subtitle {
                font-size: 16px;
                opacity: 0.9;
                font-weight: 400;
            }

            .invoice-title {
                background: linear-gradient(135deg, ${this.accentColor}, #ff8c5a);
                color: white;
                padding: 15px 30px;
                text-align: center;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 30px;
                border-radius: 8px;
                box-shadow: 0 3px 10px rgba(255, 107, 53, 0.3);
            }

            .section {
                margin-bottom: 25px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
                border-left: 4px solid ${this.primaryColor};
            }

            .section-title {
                font-weight: 700;
                color: ${this.primaryColor};
                font-size: 18px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
            }

            .section-title::before {
                content: '';
                width: 20px;
                height: 20px;
                background: ${this.primaryColor};
                border-radius: 50%;
                margin-${isArabic ? 'left' : 'right'}: 10px;
                display: inline-block;
            }

            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
            }

            .info-item {
                display: flex;
                flex-direction: column;
                padding: 12px;
                background: white;
                border-radius: 6px;
                border: 1px solid #e0e0e0;
            }

            .info-label {
                font-weight: 600;
                color: #666;
                font-size: 12px;
                text-transform: uppercase;
                margin-bottom: 5px;
                letter-spacing: 0.5px;
            }

            .info-value {
                font-weight: 500;
                color: #333;
                font-size: 14px;
            }

            .payment-status {
                display: inline-block;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .status-paid {
                background: #d4edda;
                color: #155724;
                border: 2px solid #c3e6cb;
            }

            .status-unpaid {
                background: #f8d7da;
                color: #721c24;
                border: 2px solid #f5c6cb;
            }

            .status-pending {
                background: #fff3cd;
                color: #856404;
                border: 2px solid #ffeaa7;
            }

            .total-section {
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                padding: 25px;
                border-radius: 12px;
                text-align: center;
                margin: 30px 0;
                border: 2px solid ${this.primaryColor};
            }

            .total-amount {
                font-size: 32px;
                font-weight: 700;
                color: ${this.primaryColor};
                margin-bottom: 8px;
            }

            .total-label {
                font-size: 16px;
                color: #666;
                font-weight: 500;
            }

            .footer {
                text-align: center;
                margin-top: 40px;
                padding: 25px;
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                border-radius: 10px;
                border-top: 3px solid ${this.accentColor};
            }

            .footer-message {
                font-size: 16px;
                color: #333;
                font-weight: 500;
                margin-bottom: 8px;
            }

            .footer-submessage {
                font-size: 14px;
                color: #666;
                font-style: italic;
            }            .company-info {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                color: #888;
                font-size: 12px;
            }

            .company-logo {
                text-align: center;
                margin-bottom: 20px;
            }

            .logo {
                max-width: 120px;
                max-height: 80px;
                object-fit: contain;
            }

            .hotel-image-container {
                text-align: center;
                margin: 20px 0;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            }

            .hotel-image {
                max-width: 100%;
                height: 200px;
                object-fit: cover;
                border-radius: 10px;
            }

            .guest-details {
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-top: 15px;
            }

            .guest-item {
                display: flex;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #f0f0f0;
            }

            .guest-item:last-child {
                border-bottom: none;
            }

            .guest-number {
                font-weight: 600;
                color: ${this.primaryColor};
                margin-${isArabic ? 'left' : 'right'}: 15px;
                min-width: 80px;
            }

            .guest-info {
                flex: 1;
            }

            .guest-name {
                font-weight: 500;
                margin-bottom: 2px;
            }

            .guest-phone {
                font-size: 12px;
                color: #666;
            }

            .full-width-item {
                grid-column: 1 / -1;
            }

            .notes-section {
                background: #fff9c4;
                border: 1px solid #f0e68c;
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
            }

            .notes-content {
                color: #8b7355;
                font-style: italic;
                line-height: 1.5;
            }

            @media print {
                .invoice-container {
                    padding: 20px;
                }

                .header {
                    background: ${this.primaryColor} !important;
                    -webkit-print-color-adjust: exact;
                }

                .invoice-title {
                    background: ${this.accentColor} !important;
                    -webkit-print-color-adjust: exact;
                }
            }
        </style>
    </head>    <body>
        <div class="invoice-container">
            ${getCompanyLogoHTML()}

            <div class="header">
                <h1>${trans.companyName}</h1>
                <div class="subtitle">Premium Travel & Tourism Services</div>
            </div>

            <div class="invoice-title">
                ${trans.invoice}
            </div>

            <div class="section">
                <div class="section-title">${trans.invoiceInfo}</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">${trans.invoiceNumber}</div>
                        <div class="info-value">${invoiceData.invoiceId}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">${trans.issueDate}</div>
                        <div class="info-value">${formatDate(invoiceData.createdAt)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">${trans.paymentStatus}</div>
                        <div class="info-value">
                            <span class="payment-status status-${invoiceData.paymentStatus || 'pending'}">
                                ${getPaymentStatusDisplay(invoiceData.paymentStatus)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">${trans.clientInfo}</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">${trans.fullName}</div>
                        <div class="info-value">${invoiceData.clientName || invoiceData.touristName}</div>
                    </div>
                    ${invoiceData.bookerName && invoiceData.bookerName !== invoiceData.clientName ? `
                    <div class="info-item">
                        <div class="info-label">${trans.bookerName}</div>
                        <div class="info-value">${invoiceData.bookerName}</div>
                    </div>
                    ` : ''}
                    <div class="info-item">
                        <div class="info-label">${trans.nationality}</div>
                        <div class="info-value">${invoiceData.clientNationality || invoiceData.nationality}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">${trans.phone}</div>
                        <div class="info-value">${invoiceData.clientPhone || invoiceData.phone}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">${trans.email}</div>
                        <div class="info-value">${invoiceData.clientEmail || invoiceData.email}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">${trans.bookingDetails}</div>

                ${getHotelImageHTML()}

                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">${trans.hotelName}</div>
                        <div class="info-value">${invoiceData.hotelName}</div>
                    </div>                    ${invoiceData.hotelAddress ? `
                    <div class="info-item">
                        <div class="info-label">${trans.hotelAddress}</div>
                        <div class="info-value">${invoiceData.hotelAddress}</div>
                    </div>
                    ` : ''}                    ${(invoiceData.hotel && invoiceData.hotel.city) ? `
                    <div class="info-item">
                        <div class="info-label">${trans.hotelCity}</div>
                        <div class="info-value">${invoiceData.hotel.city}</div>
                    </div>
                    ` : ''}
                    ${(invoiceData.hotel && invoiceData.hotel.country) ? `
                    <div class="info-item">
                        <div class="info-label">${trans.hotelCountry}</div>
                        <div class="info-value">${invoiceData.hotel.country}</div>
                    </div>
                    ` : ''}
                    ${invoiceData.roomType ? `
                    <div class="info-item">
                        <div class="info-label">${trans.roomType}</div>
                        <div class="info-value">${translateValue('roomType', invoiceData.roomType)}</div>
                    </div>
                    ` : ''}
                    ${invoiceData.stayType ? `
                    <div class="info-item">
                        <div class="info-label">${trans.stayType}</div>
                        <div class="info-value">${translateValue('stayType', invoiceData.stayType)}</div>
                    </div>
                    ` : ''}
                    ${invoiceData.checkInDate ? `
                    <div class="info-item">
                        <div class="info-label">${trans.checkIn}</div>
                        <div class="info-value">${formatDate(invoiceData.checkInDate)}</div>
                    </div>
                    ` : ''}
                    ${invoiceData.checkOutDate ? `
                    <div class="info-item">
                        <div class="info-label">${trans.checkOut}</div>
                        <div class="info-value">${formatDate(invoiceData.checkOutDate)}</div>
                    </div>
                    ` : ''}
                    ${invoiceData.expectedCheckInTime ? `
                    <div class="info-item">
                        <div class="info-label">${trans.checkInTime}</div>
                        <div class="info-value">${invoiceData.expectedCheckInTime}</div>
                    </div>
                    ` : ''}
                    ${nights ? `
                    <div class="info-item">
                        <div class="info-label">${trans.nights}</div>
                        <div class="info-value">${nights}</div>
                    </div>
                    ` : ''}
                    ${invoiceData.numberOfRooms ? `
                    <div class="info-item">
                        <div class="info-label">${trans.numberOfRooms}</div>
                        <div class="info-value">${invoiceData.numberOfRooms}</div>
                    </div>
                    ` : ''}
                    ${invoiceData.numberOfGuests ? `
                    <div class="info-item">
                        <div class="info-label">${trans.numberOfGuests}</div>
                        <div class="info-value">${invoiceData.numberOfGuests}</div>
                    </div>
                    ` : ''}
                    ${invoiceData.paymentMethod && invoiceData.paymentMethod !== 'pending' ? `
                    <div class="info-item">
                        <div class="info-label">${trans.paymentMethod}</div>
                        <div class="info-value">${invoiceData.paymentMethod}</div>
                    </div>
                    ` : ''}
                </div>

                ${invoiceData.guests && invoiceData.guests.length > 0 ? `
                <div class="info-item full-width-item">
                    <div class="info-label">${trans.guestDetails}</div>
                    <div class="guest-details">
                        ${getGuestDetailsHTML()}
                    </div>
                </div>
                ` : ''}

                ${invoiceData.notes ? `
                <div class="info-item full-width-item">
                    <div class="info-label">${trans.notes}</div>
                    <div class="notes-section">
                        <div class="notes-content">${invoiceData.notes}</div>
                    </div>
                </div>
                ` : ''}
            </div>

            <div class="total-section">
                <div class="total-amount">
                    ${invoiceData.amount ? invoiceData.amount.toLocaleString(isArabic ? 'ar-SA' : 'en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }) : '0.00'} ${trans.currency}
                </div>
                <div class="total-label">${trans.totalAmount}</div>
            </div>

            <div class="footer">
                <div class="footer-message">${trans.thankYou}</div>
                <div class="footer-submessage">${trans.wishYou}</div>

                <div class="company-info">
                    <div>Gaith Tours - Travel & Tourism Company</div>
                    <div>Professional Hotel Booking Services</div>
                    <div>Generated on ${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate invoice PDF using HTML-to-PDF approach
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateInvoicePDF(invoiceData, language = 'en') {
    return new Promise((resolve, reject) => {
      try {
        const htmlContent = this.generateHTMLTemplate(invoiceData, language);

        const options = {
          format: 'A4',
          orientation: 'portrait',
          border: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          timeout: 30000,
          type: 'pdf',
          quality: '100',
          dpi: 300,
          zoomFactor: 1,
          renderDelay: 1000, // Wait for fonts to load
          phantomArgs: ['--load-images=yes', '--local-to-remote-url-access=yes']
        };

        htmlPdf.create(htmlContent, options).toBuffer((err, buffer) => {
          if (err) {
            console.error('❌ Error generating HTML-to-PDF invoice:', err);
            reject(err);
          } else {
            console.log(`✅ HTML-to-PDF invoice generated successfully for language: ${language}`);
            resolve(buffer);
          }
        });

      } catch (error) {
        console.error('❌ Error in generateInvoicePDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate invoice PDF and save to file
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @param {string} outputPath - Output file path
   * @returns {Promise<boolean>} Success status
   */
  async generateInvoicePDFToFile(invoiceData, language = 'en', outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const htmlContent = this.generateHTMLTemplate(invoiceData, language);

        const options = {
          format: 'A4',
          orientation: 'portrait',
          border: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          timeout: 30000,
          type: 'pdf',
          quality: '100',
          dpi: 300,
          zoomFactor: 1,
          renderDelay: 1000,
          phantomArgs: ['--load-images=yes', '--local-to-remote-url-access=yes']
        };

        htmlPdf.create(htmlContent, options).toFile(outputPath, (err, res) => {
          if (err) {
            console.error('❌ Error generating HTML-to-PDF invoice to file:', err);
            reject(false);
          } else {
            console.log(`✅ HTML-to-PDF invoice saved to: ${outputPath}`);
            resolve(true);
          }
        });

      } catch (error) {
        console.error('❌ Error in generateInvoicePDFToFile:', error);
        reject(false);
      }
    });
  }
}

module.exports = HTMLToPDFInvoiceGenerator;
