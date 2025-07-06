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
} catch (error) {
  console.error(`❌ Error loading jspdf-autotable: ${error.message}`);
  console.warn('⚠️ PDF tables will not be available, falling back to simple tables');
}

class JsPDFInvoiceGenerator {
  constructor() {
    // Enhanced color scheme for better styling
    this.primaryColor = '#2C3E50'; // Dark blue-gray
    this.accentColor = '#3498DB'; // Bright blue
    this.secondaryColor = '#E74C3C'; // Red accent
    this.lightGray = '#ECF0F1'; // Light gray for backgrounds
    this.darkGray = '#7F8C8D'; // Dark gray for text
      // Use PNG logo instead of SVG
    this.logoPath = path.join(__dirname, '..', 'public', 'logo.png');
    this.hotelImagesPath = path.join(__dirname, '..', 'public', 'hotels');

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
        return true;
      } else {
        // Return as buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
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
        const regularFontBuffer = fs.readFileSync(this.fontPaths.arabic.regular);
        doc.addFileToVFS('NotoSansArabic-Regular.ttf', regularFontBuffer.toString('base64'));
        doc.addFont('NotoSansArabic-Regular.ttf', 'NotoSansArabic', 'normal');
      }

      // Register bold font if available
      if (boldExists) {
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
    const contentWidth = pageWidth - (margin * 2);    let y = margin; // Starting y position

    // Add header background
    doc.setFillColor(this.primaryColor);
    doc.rect(0, 0, pageWidth, 60, 'F'); // Header background    // Add logo if available - place it on white background below header
    try {
      if (fs.existsSync(this.logoPath)) {
        const logoData = fs.readFileSync(this.logoPath);
        const logoBase64 = logoData.toString('base64');

        // Add white circle background for logo
        const logoSize = 35;
        const logoX = isArabic ? pageWidth - margin - logoSize - 10 : margin + 10;
        const logoY = y + 25;

        // White circle background
        doc.setFillColor(255, 255, 255);
        doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 3, 'F');

        // Add logo on top of white background
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
      } else {
        console.log('⚠️ Logo file not found at:', this.logoPath);
      }
    } catch (error) {
      console.warn('⚠️ Error adding logo:', error.message);
    }// Add invoice title with enhanced styling
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'bold');
      doc.setFontSize(24);
      doc.setR2L(true); // Enable right-to-left for Arabic
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setR2L(false);
    }

    // Use white text on the colored header background
    doc.setTextColor(255, 255, 255); // White

    // Position title in header area
    const titleY = y + 20;
    doc.text(this.processText(trans.invoice, language), pageWidth / 2, titleY, { align: 'center' });

    // Add company name below title
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(14);
    doc.text(this.processText(trans.companyName, language), pageWidth / 2, titleY + 12, { align: 'center' });    // Move y position below the header with more space
    y = 85;    // Reset text color for content
    doc.setTextColor(0, 0, 0); // Black

    // PAGE 1: Invoice Information and Client Information

    // Invoice info section
    y = this.drawSection(
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
    y += 25; // More space between sections

    // Client info section
    y = this.drawSection(
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

    // PAGE 2: Booking Details and Payment Details
    // Always add a new page for booking and payment details
    doc.addPage();
    y = margin;
      // Add header for page 2
    doc.setFillColor(this.primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'bold');
      doc.setR2L(true);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);
    }
    doc.setFontSize(18);
    doc.text(this.processText(trans.invoice, language), pageWidth / 2, 25, { align: 'center' });
      y = 60;
    doc.setTextColor(0, 0, 0); // Reset to black    // Add hotel image if available (centered)
    let hotelImageY = y;
    try {
      if (invoiceData.hotelName || (invoiceData.hotel && invoiceData.hotel.name)) {
        const hotelName = invoiceData.hotelName || invoiceData.hotel.name;
        const hotelId = invoiceData.hotelId || (invoiceData.hotel && invoiceData.hotel.id);

        // Try to get hotel image from API or hotel data
        const hotelImageBase64 = await this.getHotelImageFromAPI(hotelId, hotelName, invoiceData);

        if (hotelImageBase64) {
          // Improved image dimensions for better visibility
          const imageWidth = 80;
          const imageHeight = 55;
          // Center the image horizontally
          const imageX = (pageWidth - imageWidth) / 2;

          // Add white background with better border for image
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(this.darkGray);
          doc.setLineWidth(1);
          doc.rect(imageX - 3, hotelImageY - 3, imageWidth + 6, imageHeight + 6, 'FD');

          // Add the image centered
          doc.addImage(hotelImageBase64, 'JPEG', imageX, hotelImageY, imageWidth, imageHeight);
          console.log('✅ Hotel image added successfully from API (centered)');

          // Ensure proper spacing after the centered image
          y = hotelImageY + imageHeight + 15;
        } else {
          console.log('⚠️ No hotel image available from API');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error adding hotel image from API:', error.message);
    }

    // Hotel/Booking info section
    if (invoiceData.hotelName || (invoiceData.hotel && invoiceData.hotel.name)) {
      y = this.drawSection(
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
          }
        ],
        margin,
        y,
        contentWidth,
        isArabic,        language
      );

      // Add more space after booking details section
      y += 40;
    }

    // PAGE 3: Payment Details
    // Add a new page specifically for payment details
    doc.addPage();
    y = margin;

    // Add header for page 3 (Payment Details)
    doc.setFillColor(this.primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'bold');
      doc.setR2L(true);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);
    }
    doc.setFontSize(18);
    doc.text(this.processText(trans.paymentDetails, language), pageWidth / 2, 25, { align: 'center' });

    y = 70;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Draw payment details table (on page 3)
    const tableEndY = this.drawPaymentTable(doc, invoiceData, language, margin, y, contentWidth);
    y = tableEndY + 10;

    // Draw footer on page 3
    this.drawFooter(doc, language, margin, pageHeight - 20, contentWidth);
  }
    /**
   * Draw a section with a title and key-value pairs   */  drawSection(doc, title, items, x, y, width, isRTL, language = 'en') {
    // Draw section background with better spacing
    const titleHeight = 18;
    doc.setFillColor(this.lightGray);
    doc.rect(x - 5, y - 5, width + 10, titleHeight, 'F'); // Background box for title

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

    // Draw title with padding
    if (isRTL) {
      doc.text(processedTitle, x + width - 5, y + 9, { align: 'right', ...options });
    } else {
      doc.text(processedTitle, x + 5, y + 9, options);
    }
    y += titleHeight + 5; // More space after title

    // Calculate content height with better spacing
    const itemsPerColumn = Math.ceil(items.length / 2);
    const lineHeight = 8;
    const itemSpacing = 2;
    const contentHeight = itemsPerColumn * (lineHeight * 2 + itemSpacing) + 10;

    // Draw content background
    doc.setFillColor(255, 255, 255); // White background
    doc.setDrawColor(this.lightGray);
    doc.setLineWidth(0.5);
    doc.rect(x - 5, y - 5, width + 10, contentHeight, 'FD'); // White box with border

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Create content rows - split into left and right columns
    const leftItems = items.slice(0, Math.ceil(items.length / 2));
    const rightItems = items.slice(Math.ceil(items.length / 2));

    // Calculate column width with better spacing
    const colWidth = (width - 20) / 2; // More space between columns

    // Draw left column
    this.drawInfoColumn(doc, leftItems, x + 5, y, colWidth, isRTL, language);

    // Draw right column
    this.drawInfoColumn(doc, rightItems, x + colWidth + 15, y, colWidth, isRTL, language);

    return y + contentHeight;
  }
  /**
   * Draw information column with key-value pairs
   */
  drawInfoColumn(doc, items, x, y, width, isRTL, language = 'en') {
    const lineHeight = 8;
    const itemSpacing = 2;

    items.forEach((item) => {
      // Label
      if (isRTL) {
        doc.setFont('NotoSansArabic', 'bold');
        doc.setR2L(true);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setR2L(false);
      }
      doc.setFontSize(9);

      // Process label with enhanced Arabic support
      const processedLabel = this.processText(item.label, language);
      const labelOptions = this.getTextOptions(item.label, language);

      if (isRTL) {
        doc.text(processedLabel, x + width, y, { align: 'right', ...labelOptions });
      } else {
        doc.text(processedLabel, x, y, labelOptions);
      }

      // Value - move down for proper spacing
      y += lineHeight;

      // Always display values in original form without any processing
      const valueText = String(item.value || '-');

      // For Arabic layout, position right but use appropriate font
      if (isRTL) {
        // Use helvetica for Latin values to ensure they display properly
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setR2L(false); // Turn off RTL for values to keep them in original format
        doc.text(valueText, x + width, y, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setR2L(false);
        doc.text(valueText, x, y);
      }

      // Move down for next item with proper spacing
      y += lineHeight + itemSpacing;
    });
  }
    /**
   * Draw payment details table
   */
  drawPaymentTable(doc, invoiceData, language, x, y, width) {
    const isArabic = language === 'ar';
    const trans = this.getTranslations(language);    // Draw payment section header with background
    doc.setFillColor(this.lightGray);
    doc.rect(x - 5, y - 5, width + 10, 20, 'F'); // Background box for title

    // Set heading for payment section
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'bold');
      doc.setR2L(true);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);
    }
    doc.setFontSize(16);
    doc.setTextColor(this.primaryColor);

    if (isArabic) {
      doc.text(this.processText(trans.paymentDetails, language), x + width - 5, y + 8, { align: 'right' });
    } else {
      doc.text(this.processText(trans.paymentDetails, language), x + 5, y + 8);
    }
    y += 25;

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
              // Amount - keep original format with English currency
              content: `${invoiceData.amount} SAR`,
              styles: { halign: 'right', font: 'helvetica' }
            },
            {
              // Payment method - keep original format, use helvetica for English text
              content: this.getPaymentMethodText(invoiceData.paymentMethod, language),
              styles: { halign: 'right', font: 'helvetica' }
            },
            {
              // Date - keep original format
              content: this.formatDate(invoiceData.createdAt, language),
              styles: { halign: 'right', font: 'helvetica' }
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
              content: `${invoiceData.amount} SAR`,
              styles: { halign: 'right' }
            }
          ]
      ];      // Table footer with total
      const tableFooter = [
        isArabic ?
          [
            {
              // Keep amount in original format with English currency
              content: `${invoiceData.amount} SAR`,
              styles: { halign: 'right', font: 'helvetica', fontStyle: 'bold' }
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
              content: `${invoiceData.amount} SAR`,
              styles: { halign: 'right', fontStyle: 'bold' }
            }
          ]
      ];// Create table with autoTable plugin
      try {
        doc.autoTable({
          startY: y,
          head: tableHead,
          body: tableBody,
          foot: tableFooter,
          theme: 'grid',
          headStyles: {
            fillColor: this.primaryColor,
            textColor: [255, 255, 255],
            fontSize: 12,
            cellPadding: 8,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 11,
            cellPadding: 6
          },
          footStyles: {
            fillColor: this.accentColor,
            textColor: [255, 255, 255],
            fontSize: 12,
            cellPadding: 8,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [249, 249, 249]
          },
          styles: {
            lineColor: [200, 200, 200],
            lineWidth: 0.1
          },
          margin: { left: x, right: pageWidth - x - width }
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
    const rowHeight = 12;
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
      // Use helvetica for English values in Arabic layout
      doc.setFont('helvetica', 'normal');
      doc.setR2L(false);

      // Display values with English currency
      doc.text(`${invoiceData.amount} SAR`, x + width - 5, y + 7, { align: 'right' });
      doc.text(this.getPaymentMethodText(invoiceData.paymentMethod, language), x + width - colWidth - 5, y + 7, { align: 'right' });
      doc.text(this.formatDate(invoiceData.createdAt, language), x + width - 2*colWidth - 5, y + 7, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setR2L(false);

      doc.text(this.formatDate(invoiceData.createdAt, language), x + 5, y + 7);
      doc.text(this.getPaymentMethodText(invoiceData.paymentMethod, language), x + colWidth + 5, y + 7);
      doc.text(`${invoiceData.amount} SAR`, x + 2*colWidth + 5, y + 7, { align: 'right' });
    }

    // Move to next row for total
    y += rowHeight + 2;

    // Draw total row
    doc.setFillColor(230, 230, 230);
    doc.rect(x, y, width, rowHeight, 'F');    // Total text
    if (isArabic) {
      // Use NotoSansArabic for Arabic label
      doc.setFont('NotoSansArabic', 'bold');
      doc.setR2L(true);
      doc.text(this.processText(trans.totalAmount, language), x + width - colWidth - 5, y + 7, { align: 'right' });

      // Use helvetica for amount value with English currency
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);
      doc.text(`${invoiceData.amount} SAR`, x + width - 5, y + 7, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setR2L(false);

      doc.text(this.processText(trans.totalAmount, language), x + 5, y + 7);
      doc.text(`${invoiceData.amount} SAR`, x + 2*colWidth + 5, y + 7, { align: 'right' });
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

    // Draw footer background
    doc.setFillColor(this.primaryColor);
    doc.rect(0, y - 15, doc.internal.pageSize.getWidth(), 40, 'F');

    // Set font for footer
    if (isArabic) {
      doc.setFont('NotoSansArabic', 'normal');
      doc.setR2L(true);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setR2L(false);
    }
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255); // White text

    // Add thank you note
    doc.text(this.processText(trans.thankYou, language), x + (width / 2), y, { align: 'center' });
    y += 8;
    doc.text(this.processText(trans.wishYou, language), x + (width / 2), y, { align: 'center' });
      // Add company contact info - always use helvetica for URLs and emails
    doc.setFont('helvetica', 'normal');
    doc.setR2L(false); // Turn off RTL for contact info
    doc.setFontSize(9);
    y += 8;
    doc.text('www.gaithtours.com | contact@gaithtours.com', x + (width / 2), y, { align: 'center' });
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
    };    return paymentMethods[method.toUpperCase()] || method.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
  /**
   * Get hotel image from API or invoice data
   * @param {string} hotelId - ID of the hotel
   * @param {string} hotelName - Name of the hotel
   * @param {object} invoiceData - Invoice data that might contain hotel image
   * @returns {Promise<string|null>} - Base64 encoded image or null if not found
   */
  async getHotelImageFromAPI(hotelId, hotelName, invoiceData) {
    try {
      // First, check if hotel image is already in the invoice data
      if (invoiceData.hotelImage) {
        // If it's already base64, return it
        if (invoiceData.hotelImage.startsWith('data:image/')) {
          return invoiceData.hotelImage.split(',')[1]; // Remove data:image/... prefix
        }
        // If it's a URL, fetch it
        if (invoiceData.hotelImage.startsWith('http')) {
          return await this.fetchImageAsBase64(invoiceData.hotelImage);
        }
        // If it's already base64 without prefix
        return invoiceData.hotelImage;
      }

      // Check if hotel object has image property
      if (invoiceData.hotel && invoiceData.hotel.image) {
        if (invoiceData.hotel.image.startsWith('data:image/')) {
          return invoiceData.hotel.image.split(',')[1];
        }
        if (invoiceData.hotel.image.startsWith('http')) {
          return await this.fetchImageAsBase64(invoiceData.hotel.image);
        }
        return invoiceData.hotel.image;
      }

      // If no direct image in data, try to fetch from hotels API
      if (hotelId) {
        try {
          const fetch = require('node-fetch');
          const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/hotels/${hotelId}`);

          if (response.ok) {
            const hotelData = await response.json();
            if (hotelData.image) {
              if (hotelData.image.startsWith('http')) {
                return await this.fetchImageAsBase64(hotelData.image);
              }
              return hotelData.image;
            }
          }
        } catch (apiError) {
          console.warn('⚠️ Failed to fetch hotel from API:', apiError.message);
        }
      }

      console.log(`⚠️ No hotel image found for: ${hotelName}`);
      return null;

    } catch (error) {
      console.warn('⚠️ Error getting hotel image from API:', error.message);
      return null;
    }
  }

  /**
   * Fetch image from URL and convert to base64
   * @param {string} imageUrl - URL of the image
   * @returns {Promise<string|null>} - Base64 encoded image or null
   */
  async fetchImageAsBase64(imageUrl) {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const buffer = await response.buffer();
      return buffer.toString('base64');

    } catch (error) {
      console.warn(`⚠️ Failed to fetch image from URL ${imageUrl}:`, error.message);
      return null;
    }
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
