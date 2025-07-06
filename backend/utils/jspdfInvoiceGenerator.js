/**
 * jsPDF-based Invoice Generator with first-class Arabic support
 *
 * This generator uses jsPDF instead of PDFKit to create PDFs,
 * which provides better support for Arabic text and works reliably even
 * in restricted environments like serverless platforms.
 */
const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');
const ArabicTextProcessor = require('./arabicTextProcessor');

// Import and apply jspdf-autotable plugin
try {
  // Simple require - this should automatically extend jsPDF
  require('jspdf-autotable');
  console.log('✅ jspdf-autotable plugin loaded successfully');
} catch (error) {
  console.error(`❌ Error loading jspdf-autotable: ${error.message}`);
  console.warn('⚠️ PDF tables will not be available, falling back to simple tables');
}

class JsPDFInvoiceGenerator {
  constructor() {
    this.primaryColor = '#00BFFF'; // Sky blue
    this.accentColor = '#ff6b35'; // Orange
    this.logoPath = path.join(__dirname, '..', 'public', 'Group.svg');

    // Initialize Arabic text processor
    this.arabicProcessor = new ArabicTextProcessor();

    // Font paths
    this.fontPaths = {
      arabic: {
        regular: path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Regular.ttf'),
        bold: path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Bold.ttf'),
      }
    };
  }

  /**
   * Generate invoice PDF
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @param {string} outputPath - Optional output path
   * @returns {Promise<Buffer|boolean>} PDF buffer or success status
   */
  async generateInvoicePDF(invoiceData, language = 'en', outputPath = null) {
    const isArabic = language === 'ar';

    try {
      console.log(`🔄 Generating PDF invoice using jsPDF for language: ${language}`);

      // Create new jsPDF instance with RTL support for Arabic
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        putOnlyUsedFonts: true
      });

      // Add Arabic font support if needed
      if (isArabic || language === 'both') {
        await this.registerArabicFonts(doc);
      }

      // Generate the invoice content
      await this.createInvoicePDF(doc, invoiceData, language);

      // Save to file or return as buffer
      if (outputPath) {
        // Ensure directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save to file
        fs.writeFileSync(outputPath, doc.output());
        console.log(`✅ PDF saved to: ${outputPath}`);
        return true;
      } else {
        // Return as buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        console.log(`✅ PDF buffer generated for ${language}`);
        return pdfBuffer;
      }

    } catch (error) {
      console.error(`❌ Error generating invoice PDF for ${language}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate invoice PDF and save to file
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @param {string} outputPath - Path to save the PDF file
   * @returns {Promise<boolean>} Success status
   */
  async generateInvoicePDFToFile(invoiceData, language = 'en', outputPath) {
    if (!outputPath) {
      throw new Error('Output path is required for generateInvoicePDFToFile');
    }

    return this.generateInvoicePDF(invoiceData, language, outputPath);
  }

  /**
   * Register Arabic fonts with jsPDF
   * @param {Object} doc - jsPDF document instance
   */
  async registerArabicFonts(doc) {
    try {
      // Check if Arabic fonts exist
      const regularExists = fs.existsSync(this.fontPaths.arabic.regular);
      const boldExists = fs.existsSync(this.fontPaths.arabic.bold);

      if (!regularExists && !boldExists) {
        console.warn('⚠️ Arabic fonts not found, falling back to default fonts');
        return;
      }

      // Register regular font if available
      if (regularExists) {
        console.log('✅ Found Arabic regular font, registering with jsPDF...');
        const regularFontBuffer = fs.readFileSync(this.fontPaths.arabic.regular);
        doc.addFileToVFS('NotoSansArabic-Regular.ttf', regularFontBuffer.toString('base64'));
        doc.addFont('NotoSansArabic-Regular.ttf', 'NotoSansArabic', 'normal');
      }

      // Register bold font if available
      if (boldExists) {
        console.log('✅ Found Arabic bold font, registering with jsPDF...');
        const boldFontBuffer = fs.readFileSync(this.fontPaths.arabic.bold);
        doc.addFileToVFS('NotoSansArabic-Bold.ttf', boldFontBuffer.toString('base64'));
        doc.addFont('NotoSansArabic-Bold.ttf', 'NotoSansArabic', 'bold');
      }

    } catch (error) {
      console.warn('⚠️ Error registering Arabic fonts:', error.message);
    }  }
    /**
   * Process text for proper rendering based on language
   * @param {string} text - Text to process
   * @param {string} language - 'en' or 'ar'
   * @param {object} options - Additional options
   * @returns {string} - Processed text
   */  processText(text, language, options = {}) {
    if (!text || typeof text !== 'string') {
      return text || '';
    }

    // For Arabic language, only process field labels, not values
    if (language === 'ar' && !options.isValue) {
      try {
        // Only process labels/field names, not actual user data
        return this.arabicProcessor.processArabicText(text);
      } catch (error) {
        console.warn(`Warning: Arabic processing failed for "${text}": ${error.message}`);
        return text;
      }
    }

    // For values or English text, return as-is
    return text;
  }

  /**
   * Get text options for jsPDF (alignment, RTL)
   * @param {string} text - Text to process
   * @param {string} language - 'en' or 'ar'
   * @returns {object} - jsPDF text options
   */
  getTextOptions(text, language) {
    const isArabic = language === 'ar' || this.arabicProcessor.hasArabic(text);

    if (isArabic) {
      return { align: 'right', R2L: true };
    }

    return { align: 'left', R2L: false };
  }

  /**
   * Create the invoice PDF content
   * @param {Object} doc - jsPDF document instance
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   */
  async createInvoicePDF(doc, invoiceData, language = 'en') {
    const isArabic = language === 'ar';
    const trans = this.getTranslations(language);

    // Set document properties
    doc.setProperties({
      title: `${trans.invoice} #${invoiceData.invoiceId || 'Unknown'}`,
      subject: trans.bookingDetails,
      author: 'Gaith Tours',
      keywords: 'invoice, booking, hotel, travel',
      creator: 'Gaith Tours Invoice System'
    });

    // Calculate page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20; // mm
    const contentWidth = pageWidth - (margin * 2);

    let y = margin; // Starting y position

    // Add logo if available (convert from SVG to PNG first)
    try {
      // For now, we'll skip the logo since SVG is not directly supported
      // TODO: Add code to convert SVG to PNG and add it
      console.log('⚠️ Logo skipped (SVG not directly supported by jsPDF)');
      y += 10; // Add space for logo
    } catch (error) {
      console.warn('⚠️ Error adding logo:', error.message);
    }
      // Add invoice title
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'bold');
      doc.setFontSize(20);
      doc.setR2L(true); // Enable right-to-left for Arabic
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setR2L(false);
    }
      doc.setTextColor(this.primaryColor);

    // Always center the title regardless of language
    doc.text(this.processText(trans.invoice, language), pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Add company name
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Black
    doc.text(this.processText(trans.companyName, language), pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Draw separator line
    doc.setDrawColor(this.accentColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
      // Invoice info section
    this.drawSection(
      doc,
      trans.invoiceInfo,
      [
        { label: trans.invoiceNumber, value: invoiceData.invoiceId || '-' },
        { label: trans.issueDate, value: this.formatDate(invoiceData.createdAt, language) },
        { label: trans.paymentStatus, value: this.getPaymentStatusText(invoiceData.paymentStatus, language) }
      ],
      margin,
      y,
      contentWidth,
      isArabic,
      language
    );
    y += 30;

    // Client info section
    this.drawSection(
      doc,
      trans.clientInfo,
      [
        { label: trans.fullName, value: invoiceData.clientName || invoiceData.touristName || '-' },
        { label: trans.nationality, value: invoiceData.clientNationality || invoiceData.nationality || '-' },
        { label: trans.phone, value: invoiceData.clientPhone || invoiceData.phone || '-' },
        { label: trans.email, value: invoiceData.clientEmail || invoiceData.email || '-' }
      ],
      margin,
      y,
      contentWidth,
      isArabic,
      language
    );
    y += 40;

    // Hotel info section
    if (invoiceData.hotelName || (invoiceData.hotel && invoiceData.hotel.name)) {
      this.drawSection(
        doc,
        trans.bookingDetails,
        [
          {
            label: trans.hotelName,
            value: invoiceData.hotelName || (invoiceData.hotel && invoiceData.hotel.name) || '-'
          },
          {
            label: trans.hotelAddress,
            value: invoiceData.hotelAddress || (invoiceData.hotel && invoiceData.hotel.address) || '-'
          },
          {
            label: trans.hotelCity,
            value: invoiceData.hotelCity || (invoiceData.hotel && invoiceData.hotel.city) || '-'
          },
          {
            label: trans.checkIn,
            value: this.formatDate(invoiceData.checkInDate, language)
          },
          {
            label: trans.checkOut,
            value: this.formatDate(invoiceData.checkOutDate, language)
          },
          {
            label: trans.numberOfGuests,
            value: invoiceData.numberOfGuests || '-'
          }        ],
        margin,
        y,
        contentWidth,
        isArabic,
        language
      );
      y += 60;    }

    // Draw payment details table
    const tableEndY = this.drawPaymentTable(doc, invoiceData, language, margin, y, contentWidth);
    y = tableEndY + 10;

    // Draw footer
    this.drawFooter(doc, language, margin, pageHeight - 20, contentWidth);
  }
    /**
   * Draw a section with a title and key-value pairs
   */  drawSection(doc, title, items, x, y, width, isRTL, language = 'en') {
    // Set title style
    if (isRTL) {
      doc.setFont('NotoSansArabic', 'bold');
      doc.setR2L(true);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);
    }
    doc.setFontSize(14);
    doc.setTextColor(this.primaryColor);

    // Process text with enhanced Arabic support
    const processedTitle = this.processText(title, language);
    const options = this.getTextOptions(title, language);

    // Draw title
    if (isRTL) {
      doc.text(processedTitle, x + width, y, { align: 'right', ...options });
    } else {
      doc.text(processedTitle, x, y, options);
    }
    y += 7;

    // Draw line under title
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(x, y, x + width, y);
    y += 7;

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Create content rows - split into left and right columns
    const leftItems = items.slice(0, Math.ceil(items.length / 2));
    const rightItems = items.slice(Math.ceil(items.length / 2));

    // Calculate column width
    const colWidth = width / 2 - 5; // 5mm gap between columns
      // Draw left column
    this.drawInfoColumn(doc, leftItems, x, y, colWidth, isRTL, language);

    // Draw right column
    this.drawInfoColumn(doc, rightItems, x + colWidth + 10, y, colWidth, isRTL, language);
  }

  /**
   * Draw information column with key-value pairs
   */
  drawInfoColumn(doc, items, x, y, width, isRTL, language = 'en') {
    const lineHeight = 7;

    items.forEach((item) => {      // Label
      if (isRTL) {
        doc.setFont('NotoSansArabic', 'bold');
        doc.setR2L(true);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setR2L(false);
      }
      doc.setFontSize(10);

      // Process label with enhanced Arabic support
      const processedLabel = this.processText(item.label, language);
      const labelOptions = this.getTextOptions(item.label, language);

      if (isRTL) {
        doc.text(processedLabel, x + width, y, { align: 'right', ...labelOptions });
      } else {
        doc.text(processedLabel, x, y, labelOptions);
      }
        // Value
      if (isRTL) {
        doc.setFont('NotoSansArabic', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }      // Move down for value
      y += lineHeight;

      // Always display values in original form without any processing
      const valueText = String(item.value || '-');

      // For Arabic layout, position right but use appropriate font
      if (isRTL) {
        // Use helvetica for Latin values to ensure they display properly
        doc.setFont('helvetica', 'normal');
        doc.setR2L(false); // Turn off RTL for values to keep them in original format
        doc.text(valueText, x + width, y, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setR2L(false);
        doc.text(valueText, x, y);
      }

      // Move down for next item
      y += lineHeight + 1;
    });
  }
    /**
   * Draw payment details table
   */
  drawPaymentTable(doc, invoiceData, language, x, y, width) {
    const isArabic = language === 'ar';
    const trans = this.getTranslations(language);

    // Set heading for payment section
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'bold');
      doc.setR2L(true);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);
    }
    doc.setFontSize(14);
    doc.setTextColor(this.primaryColor);
      if (isArabic) {
      doc.text(this.processText(trans.paymentDetails, language), x + width, y, { align: 'right' });
    } else {
      doc.text(this.processText(trans.paymentDetails, language), x, y);
    }
    y += 10;

    // Check if autoTable is available
    if (typeof doc.autoTable === 'function') {      // Create table data
      const tableHead = [
        isArabic ?
          [
            { content: this.processText(trans.amount, language), styles: { halign: 'right', font: 'NotoSansArabic', fontStyle: 'bold' } },
            { content: this.processText(trans.paymentMethod, language), styles: { halign: 'right', font: 'NotoSansArabic', fontStyle: 'bold' } },
            { content: this.processText(trans.issueDate, language), styles: { halign: 'right', font: 'NotoSansArabic', fontStyle: 'bold' } }
          ] :
          [
            { content: this.processText(trans.issueDate, language), styles: { halign: 'left', fontStyle: 'bold' } },
            { content: this.processText(trans.paymentMethod, language), styles: { halign: 'left', fontStyle: 'bold' } },
            { content: this.processText(trans.amount, language), styles: { halign: 'right', fontStyle: 'bold' } }
          ]
      ];      const tableBody = [
        isArabic ?
          [
            {
              // Amount - keep original format
              content: `${invoiceData.amount} ${trans.currency}`,
              styles: { halign: 'right', font: 'NotoSansArabic' }
            },
            {
              // Payment method - keep original format
              content: this.getPaymentMethodText(invoiceData.paymentMethod, language),
              styles: { halign: 'right', font: 'NotoSansArabic' }
            },
            {
              // Date - keep original format
              content: this.formatDate(invoiceData.createdAt, language),
              styles: { halign: 'right', font: 'NotoSansArabic' }
            }
          ] :
          [
            {
              content: this.formatDate(invoiceData.createdAt, language),
              styles: { halign: 'left' }
            },
            {
              content: this.getPaymentMethodText(invoiceData.paymentMethod, language),
              styles: { halign: 'left' }
            },
            {
              content: `${invoiceData.amount} ${trans.currency}`,
              styles: { halign: 'right' }
            }
          ]
      ];      // Table footer with total
      const tableFooter = [
        isArabic ?
          [
            {
              // Keep amount in original format
              content: `${invoiceData.amount} ${trans.currency}`,
              styles: { halign: 'right', font: 'NotoSansArabic', fontStyle: 'bold' }
            },
            {
              // Only translate the total label
              content: this.processText(trans.totalAmount, language),
              colSpan: 2,
              styles: { halign: 'right', font: 'NotoSansArabic', fontStyle: 'bold' }
            }
          ] :
          [
            {
              content: this.processText(trans.totalAmount, language),
              colSpan: 2,
              styles: { halign: 'left', fontStyle: 'bold' }
            },
            {
              content: `${invoiceData.amount} ${trans.currency}`,
              styles: { halign: 'right', fontStyle: 'bold' }
            }
          ]
      ];

      // Create table with autoTable plugin
      try {
        doc.autoTable({
          startY: y,
          head: tableHead,
          body: tableBody,
          foot: tableFooter,
          theme: 'striped',
          headStyles: {
            fillColor: this.primaryColor,
            textColor: [255, 255, 255],
            fontSize: 10,
            cellPadding: 5
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          margin: { left: x, right: x }
        });

        // Update the return value for tracking where the table ends
        return doc.lastAutoTable.finalY;
      } catch (error) {
        console.warn(`⚠️ Error creating table with autoTable: ${error.message}`);
        console.warn('⚠️ Falling back to manual table rendering');
        return this.drawSimpleTable(doc, invoiceData, language, x, y, width);
      }
    } else {
      console.warn('⚠️ jsPDF autoTable plugin not available, falling back to simple table');
      return this.drawSimpleTable(doc, invoiceData, language, x, y, width);
    }
  }

  /**
   * Draw a simple table without using the autoTable plugin (fallback)
   */
  drawSimpleTable(doc, invoiceData, language, x, y, width) {
    const isArabic = language === 'ar';
    const trans = this.getTranslations(language);

    const startY = y;
    const rowHeight = 10;
    const colWidth = width / 3;

    // Set font
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'bold');
      doc.setR2L(true);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);
    }
    doc.setFontSize(10);

    // Draw table header - background
    doc.setFillColor(this.primaryColor);
    doc.rect(x, y, width, rowHeight, 'F');

    // Header text - in white
    doc.setTextColor(255, 255, 255);
      if (isArabic) {
      // Right-to-left header
      doc.text(this.processText(trans.amount, language), x + width - 5, y + 7, { align: 'right' });
      doc.text(this.processText(trans.paymentMethod, language), x + width - colWidth - 5, y + 7, { align: 'right' });
      doc.text(this.processText(trans.issueDate, language), x + width - 2*colWidth - 5, y + 7, { align: 'right' });
    } else {
      // Left-to-right header
      doc.text(this.processText(trans.issueDate, language), x + 5, y + 7);
      doc.text(this.processText(trans.paymentMethod, language), x + colWidth + 5, y + 7);
      doc.text(this.processText(trans.amount, language), x + 2*colWidth + 5, y + 7, { align: 'right' });
    }

    // Move to next row
    y += rowHeight;

    // Draw table row - light gray background
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, width, rowHeight, 'F');    // Row text - in black
    doc.setTextColor(0, 0, 0);    if (isArabic) {
      doc.setFont('NotoSansArabic', 'normal');

      // Keep RTL off for actual values in Arabic mode
      doc.setR2L(false);

      // Display values directly without processing, but positioned for RTL
      doc.text(`${invoiceData.amount} ${trans.currency}`, x + width - 5, y + 7, { align: 'right' });
      doc.text(this.getPaymentMethodText(invoiceData.paymentMethod, language), x + width - colWidth - 5, y + 7, { align: 'right' });
      doc.text(this.formatDate(invoiceData.createdAt, language), x + width - 2*colWidth - 5, y + 7, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setR2L(false);

      doc.text(this.formatDate(invoiceData.createdAt, language), x + 5, y + 7);
      doc.text(this.getPaymentMethodText(invoiceData.paymentMethod, language), x + colWidth + 5, y + 7);
      doc.text(`${invoiceData.amount} ${trans.currency}`, x + 2*colWidth + 5, y + 7, { align: 'right' });
    }

    // Move to next row for total
    y += rowHeight + 2;

    // Draw total row
    doc.setFillColor(230, 230, 230);
    doc.rect(x, y, width, rowHeight, 'F');    // Total text
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'bold');

      // Process label with RTL
      doc.setR2L(true);
      doc.text(this.processText(trans.totalAmount, language), x + width - colWidth - 5, y + 7, { align: 'right' });

      // Keep amount in original format
      doc.setR2L(false);
      doc.text(`${invoiceData.amount} ${trans.currency}`, x + width - 5, y + 7, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);

      doc.text(this.processText(trans.totalAmount, language), x + 5, y + 7);
      doc.text(`${invoiceData.amount} ${trans.currency}`, x + 2*colWidth + 5, y + 7, { align: 'right' });
    }
      // Return the Y position after the table
    return y + rowHeight + 5;
  }

  /**
   * Draw footer with thank you note
   */
  drawFooter(doc, language, x, y, width) {
    const isArabic = language === 'ar';
    const trans = this.getTranslations(language);

    // Draw separator line
    doc.setDrawColor(this.accentColor);
    doc.setLineWidth(0.5);
    doc.line(x, y - 10, x + width, y - 10);

    // Set font for footer
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'normal');
      doc.setR2L(true);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setR2L(false);
    }
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100); // Gray text
      // Add thank you note
    doc.text(this.processText(trans.thankYou, language), x + (width / 2), y, { align: 'center' });
    y += 5;
    doc.text(this.processText(trans.wishYou, language), x + (width / 2), y, { align: 'center' });
  }

  /**
   * Format date based on language
   */  formatDate(dateString, language = 'en') {
    if (!dateString) return '-';

    const date = new Date(dateString);

    // Always use English date format, regardless of language
    // Only field labels should be in Arabic, not the actual date values
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  /**
   * Get payment status display text
   */
  getPaymentStatusText(status, language) {
    if (!status) return '-';

    // Always return English status text (don't translate values)
    const statusMap = {
      'PAID': 'Paid',
      'UNPAID': 'Unpaid',
      'PENDING': 'Pending',
      'CONFIRMED': 'Confirmed',
      'CANCELLED': 'Cancelled',
      'COMPLETED': 'Completed'
    };

    return statusMap[status.toUpperCase()] || status;
  }
  /**
   * Get payment method display text
   */  getPaymentMethodText(method, language) {
    if (!method) return '-';

    // Always return English payment method text (don't translate values)
    const paymentMethods = {
      'CREDIT_CARD': 'Credit Card',
      'DEBIT_CARD': 'Debit Card',
      'BANK_TRANSFER': 'Bank Transfer',
      'CASH': 'Cash',
      'PAYPAL': 'PayPal',
      'APPLE_PAY': 'Apple Pay',
      'GOOGLE_PAY': 'Google Pay',
      'OTHERS': 'Others'
    };

    return paymentMethods[method.toUpperCase()] || method.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get translations based on language
   */
  getTranslations(language) {
    const translations = {
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
        bookingDetails: 'Booking Details',
        hotelName: 'Hotel Name',
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
        amount: 'Amount',
        totalAmount: 'Total Amount',
        currency: 'SAR',
        thankYou: 'Thank you for choosing our services',
        wishYou: 'We wish you a pleasant and safe stay',
        paid: 'PAID',
        unpaid: 'UNPAID',
        pending: 'PENDING',
        confirmed: 'CONFIRMED',
        cancelled: 'CANCELLED',
        completed: 'COMPLETED'
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
        bookingDetails: 'تفاصيل الحجز',
        hotelName: 'اسم الفندق',
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
        amount: 'المبلغ',
        totalAmount: 'إجمالي المبلغ',
        currency: 'ريال سعودي',
        thankYou: 'شكراً لكم لاختيار خدماتنا',
        wishYou: 'نتمنى لكم إقامة ممتعة وآمنة',
        paid: 'مدفوعة',
        unpaid: 'غير مدفوعة',
        pending: 'في الانتظار',
        confirmed: 'مؤكدة',
        cancelled: 'ملغية',
        completed: 'مكتملة'
      }
    };

    return translations[language] || translations.en;
  }
}

module.exports = JsPDFInvoiceGenerator;
