// Use puppeteer-core as a base dependency, which doesn't bundle Chromium
const puppeteer = require('puppeteer-core');
// Optionally try to use puppeteer if available (which includes the browser)
let puppeteerWithBrowser;
try {
  puppeteerWithBrowser = require('puppeteer');
} catch (e) {
  // Puppeteer not installed, will use puppeteer-core with fallbacks
  puppeteerWithBrowser = null;
}

const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const os = require('os');
const crypto = require('crypto');

/**
 * HTML-to-PDF Invoice Generator with perfect Arabic support and fallback mechanisms
 * Uses a combination of strategies for reliable PDF generation:
 * 1. Primary: Puppeteer with optimized settings if Chrome is available
 * 2. Secondary: Auto-installation of Chrome when possible
 * 3. Fallback: Direct HTML rendering with embedded print styles
 * 4. Emergency: Static HTML file generation
 *
 * VERCEL DEPLOYMENT INSTRUCTIONS:
 * For PDF generation on Vercel, you'll need to add Chrome to your project:
 *
 * 1. Install chrome-aws-lambda as a dependency:
 *    npm install chrome-aws-lambda@latest --save
 *
 * 2. Add the Chrome AWS Lambda Layer to your Vercel project:
 *    See: https://github.com/vercel/vercel/tree/main/examples/chrome-aws-lambda
 *
 * 3. Set the CHROME_EXECUTABLE_PATH environment variable in your Vercel project settings:
 *    Key: CHROME_EXECUTABLE_PATH
 *    Value: /opt/chrome/chrome (or the path provided by your Chrome layer)
 *
 * 4. If you're getting timeout errors, increase the function timeout in vercel.json:
 *    { "functions": { "api/**": { "maxDuration": 30 } } }
 */
class HTMLToPDFInvoiceGenerator {
  constructor() {
    this.primaryColor = '#00BFFF'; // Sky blue
    this.accentColor = '#ff6b35'; // Orange
    this.logoPath = path.join(__dirname, '..', 'public', 'Group.svg');

    // Determine environment constraints
    const isLowMemoryEnv = process.env.LOW_MEMORY === 'true';
    const memoryLimit = process.env.CHROME_MEMORY_LIMIT || '512';

    // Chrome executable path (will be set after detection)
    this.chromePath = undefined;

    // Whether PDF generation is possible at all
    this.pdfGenerationPossible = undefined;
      // Environment detection - more comprehensive
    this.isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME ||
                        process.env.VERCEL ||
                        process.env.VERCEL_ENV ||
                        process.env.VERCEL_REGION ||
                        process.env.NETLIFY ||
                        process.env.AWS_REGION ||
                        process.env.LAMBDA_TASK_ROOT;

    // Specific Vercel detection
    this.isVercel = !!process.env.VERCEL ||
                   !!process.env.VERCEL_ENV ||
                   !!process.env.VERCEL_REGION ||
                   !!process.env.NOW_REGION;

    this.isDockerContainer = fs.existsSync('/.dockerenv') ||
                           (fs.existsSync('/proc/1/cgroup') &&
                           fs.readFileSync('/proc/1/cgroup', 'utf-8').includes('docker'));

    // Puppeteer launch options for maximum stability
    this.puppeteerOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-3d-apis',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-sync',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-translate',
        '--disable-notifications',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-features=IsolateOrigins',
        '--disable-features=site-per-process',
        `--js-flags=--max-old-space-size=${memoryLimit}`,
        '--font-render-hinting=none'
      ].filter(Boolean),
      headless: true,
      timeout: 30000, // 30 seconds max
      protocolTimeout: 20000,
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 800,
        height: 1200,
        deviceScaleFactor: 1,
        isLandscape: false
      },
      pipe: false,
      dumpio: false
    };

    // Add a static counter for limiting concurrent operations
    this.constructor.concurrentOperations = this.constructor.concurrentOperations || 0;
    this.constructor.maxConcurrentOperations = 1;

    // Add a sequential lock to prevent parallel runs
    this.constructor.pdfLock = this.constructor.pdfLock || Promise.resolve();

    // Cache for browser capability results
    this.constructor.browserChecked = this.constructor.browserChecked || false;
    this.constructor.browserAvailable = this.constructor.browserAvailable || false;

    // Track if we've tested system compatibility
    this.constructor.systemChecked = this.constructor.systemChecked || false;

    // Initialize browser detection
    this.initializeEnvironment();
  }
  /**
   * Initialize the environment and detect browser capabilities
   * @returns {Promise<void>}
   */
  async initializeEnvironment() {
    if (!this.constructor.browserChecked) {
      try {
        console.log('🔍 Checking runtime environment...');

        // Early environment detection for Vercel
        if (this.isVercel) {
          console.log('🌐 Running in Vercel serverless environment');
          console.log('⚠️ PDF generation in Vercel requires special handling');

          // Check for Vercel specific environment variables
          if (process.env.CHROME_EXECUTABLE_PATH) {
            // Vercel has specified a Chrome path
            this.chromePath = process.env.CHROME_EXECUTABLE_PATH;
            this.constructor.browserAvailable = true;
            console.log(`✅ Using custom Chrome path from CHROME_EXECUTABLE_PATH: ${this.chromePath}`);
          } else {
            // On Vercel without custom Chrome path
            console.warn('⚠️ Running on Vercel without Chrome configuration');
            console.warn('⚠️ Add CHROME_EXECUTABLE_PATH environment variable in Vercel project settings');
            console.warn('⚠️ Falling back to HTML-only mode');
            this.constructor.browserAvailable = false;
            this.constructor.browserChecked = true;
            this.pdfGenerationPossible = false;
            return;
          }
        } else if (this.isServerless) {
          console.log('☁️ Running in generic serverless environment');
        }

        console.log('🔍 Checking for Chrome installation...');

        // Check for Chrome installation
        const chromePath = this.isVercel && this.chromePath ?
                           this.chromePath :
                           await this.findChromePath();

        if (chromePath) {
          // Chrome is available
          this.constructor.browserAvailable = true;
          this.chromePath = chromePath;
          console.log(`✅ Chrome is available for PDF generation at: ${chromePath}`);
        } else {
          console.log('⚠️ Chrome not found in default locations');

          // Try auto-installation if not in a restricted environment
          if (!this.isServerless && !this.isDockerContainer) {
            console.log('🔄 Attempting to install Chrome automatically...');
            const installed = await this.tryInstallChrome();
            this.constructor.browserAvailable = installed;

            if (installed) {
              // Re-check path after installation
              this.chromePath = await this.findChromePath();
              console.log(`✅ Successfully installed Chrome at: ${this.chromePath}`);
            } else {
              console.warn('⚠️ Chrome installation failed, PDF generation will not be available');
            }
          } else {
            console.log('⚠️ Running in restricted environment, skipping Chrome installation');
            console.log('⚠️ PDF generation will not be available, will use HTML fallback');
            this.constructor.browserAvailable = false;
          }
        }
      } catch (error) {
        console.error(`❌ Browser detection failed: ${error.message}`);
        this.constructor.browserAvailable = false;
      }

      this.constructor.browserChecked = true;

      // Log status
      if (this.constructor.browserAvailable) {
        console.log('✅ PDF generation is available and will be used');
      } else {
        let reason = 'unknown reason';
        if (this.isVercel) {
          reason = 'Vercel serverless environment without Chrome configuration';
        } else if (this.isServerless) {
          reason = 'serverless environment restrictions';
        } else if (this.isDockerContainer) {
          reason = 'Docker container without Chrome installed';
        } else if (!this.chromePath) {
          reason = 'Chrome not found on system';
        }

        console.warn(`⚠️ PDF generation is NOT available (${reason})`);
        console.warn('⚠️ HTML fallback will be used instead of PDF');
      }
    }

    // Set flag for PDF generation possibility
    this.pdfGenerationPossible = this.constructor.browserAvailable;
  }

  // Call this at module load time
  static async initialize() {
    const generator = new HTMLToPDFInvoiceGenerator();
    await generator.initializeEnvironment();
    return generator.constructor.browserAvailable;
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
    }    return ''; // Return empty string if logo cannot be loaded
  }

  /**
   * Wait for available slot to prevent too many concurrent operations
   */
  async waitForSlot() {
    while (this.constructor.concurrentOperations >= this.constructor.maxConcurrentOperations) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.constructor.concurrentOperations++;
  }

  /**
   * Release slot after operation completes
   */
  releaseSlot() {
    if (this.constructor.concurrentOperations > 0) {
      this.constructor.concurrentOperations--;
    }
  }
  /**
   * Generate PDF with retry logic
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - Language code
   * @param {string} outputPath - Optional output path
   * @returns {Promise<Buffer|boolean>} PDF buffer or success status
   */  async generatePDFWithRetry(invoiceData, language = 'en', outputPath = null) {    // If PDF generation is not possible, return early
    if (this.pdfGenerationPossible === false) {
      let message = '⚠️ PDF generation not possible';

      // Add environment-specific messaging
      if (this.isVercel) {
        message += ' in Vercel serverless environment';
        console.warn(message);
        console.warn('⚠️ To enable PDF generation on Vercel:');
        console.warn('⚠️ 1. Add Chrome Layer: https://github.com/vercel/vercel/tree/main/examples/chrome-aws-lambda');
        console.warn('⚠️ 2. Set CHROME_EXECUTABLE_PATH environment variable');
      } else if (this.isServerless) {
        message += ' in serverless environment';
        console.warn(message);
      } else {
        console.warn(message + ', skipping and returning HTML');
      }

      if (outputPath) {
        // Write HTML to file instead
        const htmlPath = outputPath.replace(/\.pdf$/i, '.html');
        const html = this.generateHTMLTemplate(invoiceData, language);
        fs.writeFileSync(htmlPath, html);
        console.warn(`⚠️ Writing HTML to file instead: ${htmlPath}`);
        return false;
      } else {
        // Return HTML content as buffer
        console.warn('⚠️ Returning HTML content instead of PDF');
        return Buffer.from(this.generateHTMLTemplate(invoiceData, language), 'utf-8');
      }
    }

    const maxRetries = 3;
    let lastError;    // Use a sequential locking pattern to prevent concurrent puppeteer instances
    // This creates a chain of promises that execute one after another
    this.constructor.pdfLock = this.constructor.pdfLock.then(async () => {
      // Check if Chrome is available first
      const chromePath = await this.findChromePath();
      if (chromePath === null) {
        console.warn('⚠️ No Chrome executable found, PDF generation not possible');
        this.pdfGenerationPossible = false; // Update the flag to prevent future attempts
        throw new Error('Chrome not available for PDF generation');
      }

      // Update chrome path and generation flag
      this.chromePath = chromePath;
      this.pdfGenerationPossible = true;

      // Inside the lock, we'll retry up to maxRetries times
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 PDF generation attempt ${attempt}/${maxRetries} for ${language}`);

          // Add longer delay between retries for browser stability
          if (attempt > 1) {
            const delay = Math.pow(2, attempt) * 1000; // Increased delay
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Force memory cleanup
          if (global.gc && attempt > 1) {
            try {
              global.gc();
              console.log('🧹 Forced garbage collection');
            } catch (e) {
              // Ignore if not available
            }
          }

          // Try different approaches for different retry attempts
          let result;
          if (attempt === 1) {
            // Standard approach
            result = await this.generatePDFInternal(invoiceData, language, outputPath);
          } else if (attempt === 2) {
            // Minimal browser approach
            console.log('🔄 Trying minimal browser approach...');
            result = await this.generatePDFMinimal(invoiceData, language, outputPath);
          } else {
            // Final attempt with file-based approach
            console.log('🔄 Trying file-based approach...');
            result = await this.generatePDFFromFile(invoiceData, language, outputPath);
          }

          return result;
        } catch (error) {
          lastError = error;
          console.error(`❌ Attempt ${attempt} failed:`, error.message);

          // If Chrome wasn't found or couldn't be launched, mark PDF generation as not possible
          if (error.message.includes('Could not find Chrome') ||
              error.message.includes('Failed to launch browser')) {
            this.constructor.browserAvailable = false;
            this.pdfGenerationPossible = false;
            throw new Error('Chrome not available: ' + error.message);
          }

          // If it's a browser connection issue, try more aggressive cleanup
          if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
            console.log('🔧 Browser connection issue detected, forcing cleanup...');

            // Additional delay for browser connection issues
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }
      }

      console.error(`❌ All ${maxRetries} attempts failed for ${language}`);
      throw new Error(`PDF generation failed after ${maxRetries} attempts: ${lastError.message}`);
    }).catch(error => {
      // Ensure the lock chain doesn't break
      console.error('🔒 Error in PDF generation lock chain:', error.message);
      throw error;
    });

    // Wait for our turn in the lock chain and return the result
    return this.constructor.pdfLock;
  }
  /**
   * Internal PDF generation method
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - Language code
   * @param {string} outputPath - Optional output path
   * @returns {Promise<Buffer|boolean>} PDF buffer or success status
   */
  async generatePDFInternal(invoiceData, language = 'en', outputPath = null) {
    await this.waitForSlot();

    let browser = null;
    let page = null;

    try {
      console.log(`🚀 Starting PDF generation for ${language}...`);      // Get Chrome path
      const chromePath = await this.findChromePath();
      if (!chromePath) {
        throw new Error('Chrome executable not found');
      }

      console.log(`🚀 Launching Chrome from: ${chromePath}`);

      // Determine which puppeteer module to use
      const puppeteerToUse = puppeteerWithBrowser || puppeteer;

      // Launch browser with enhanced options
      browser = await puppeteerToUse.launch({
        ...this.puppeteerOptions,
        executablePath: chromePath,
        // Remove problematic options that might cause instability
        args: this.puppeteerOptions.args.filter(arg =>
          !arg.includes('--disable-javascript') &&
          !arg.includes('--disable-images')
        )
      });

      // Ensure browser is still connected
      if (!browser || !browser.connected) {
        throw new Error('Browser failed to launch or connect');
      }

      // Create page with error handling
      page = await browser.newPage();

      // Set more conservative timeouts
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);

      // Set viewport
      await page.setViewport({
        width: 800,
        height: 1200,
        deviceScaleFactor: 1
      });

      // Generate HTML content
      const htmlContent = this.generateHTMLTemplate(invoiceData, language);

      // Set content with better error handling
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 45000
      });

      // Wait for page to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if browser is still connected before PDF generation
      if (!browser.connected) {
        throw new Error('Browser disconnected before PDF generation');
      }

      // PDF generation options
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        timeout: 30000
      };

      // Generate PDF with path or buffer
      if (outputPath) {
        // Ensure directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generate PDF to file
        await page.pdf({
          ...pdfOptions,
          path: outputPath
        });

        console.log(`✅ PDF saved to: ${outputPath}`);
        return true;
      } else {
        // Generate PDF buffer
        const pdfBuffer = await page.pdf(pdfOptions);

        console.log(`✅ PDF buffer generated for ${language}`);
        return pdfBuffer;
      }

    } catch (error) {
      console.error(`❌ PDF generation failed for ${language}:`, error.message);

      // Re-throw with more specific error info
      if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
        throw new Error(`Browser connection lost during PDF generation: ${error.message}`);
      }

      throw error;

    } finally {
      // Enhanced cleanup with proper error handling
      if (page && !page.isClosed()) {
        try {
          await Promise.race([
            page.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Page close timeout')), 5000))
          ]);
        } catch (error) {
          console.warn('⚠️ Error closing page:', error.message);
        }
      }

      if (browser && browser.connected) {
        try {
          await Promise.race([
            browser.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 5000))
          ]);
        } catch (error) {
          console.warn('⚠️ Error closing browser:', error.message);
        }
      }

      // Release slot
      this.releaseSlot();
    }
  }
  /**
   * Test browser launch and PDF generation capability
   * @returns {Promise<{canLaunch: boolean, canGeneratePdf: boolean}>} Capability test results
   */
  async testBrowserLaunch() {
    let browser = null;
    let page = null;
    let capabilities = {
      canLaunch: false,
      canGeneratePdf: false
    };

    try {
      console.log('🧪 Testing browser launch capability...');      // Get Chrome path
      const chromePath = await this.findChromePath();
      if (!chromePath) {
        console.warn('⚠️ No Chrome found, browser launch test will fail');
        return { canLaunch: false, canGeneratePdf: false };
      }

      console.log(`🧪 Testing browser launch with Chrome: ${chromePath}`);

      // Determine which puppeteer module to use
      const puppeteerToUse = puppeteerWithBrowser || puppeteer;

      // Use minimal browser options for testing
      browser = await puppeteerToUse.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: chromePath,
        headless: true,
        timeout: 10000
      });

      capabilities.canLaunch = browser && browser.connected;
      console.log(`✅ Browser launch test: ${capabilities.canLaunch ? 'PASSED' : 'FAILED'}`);

      if (capabilities.canLaunch) {
        // Test PDF generation with minimal content
        try {
          page = await browser.newPage();
          await page.setContent('<html><body><h1>Test</h1></body></html>');

          // Try to generate a minimal PDF
          await page.pdf({
            format: 'A4',
            margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
          });

          capabilities.canGeneratePdf = true;
          console.log('✅ PDF generation test: PASSED');
        } catch (pdfError) {
          console.warn(`⚠️ PDF generation test failed: ${pdfError.message}`);
          capabilities.canGeneratePdf = false;
        }
      }

      return capabilities;
    } catch (error) {
      console.warn('⚠️ Browser launch test failed:', error.message);
      return capabilities;
    } finally {
      // Clean up resources
      if (page) {
        try {
          await page.close().catch(() => {});
        } catch (error) {
          console.warn('⚠️ Error closing test page:', error.message);
        }
      }

      if (browser && browser.connected) {
        try {
          await browser.close().catch(() => {});
        } catch (error) {
          console.warn('⚠️ Error closing test browser:', error.message);
        }
      }
    }
  }
  /**
   * Generate PDF with multiple fallback strategies
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - Language code
   * @returns {Promise<Buffer|string>} PDF buffer or HTML string as fallback
   */
  async generatePDFWithFallback(invoiceData, language = 'en') {
    // Check system resources first
    const isSystemCompatible = await this.checkSystemCompatibility();

    if (!isSystemCompatible) {
      console.warn('⚠️ System resources insufficient, skipping browser launch and using HTML fallback');
      return this.generateHTMLTemplate(invoiceData, language);
    }

    try {
      // Strategy 1: Try standard puppeteer PDF generation
      try {
        console.log('🔄 Attempting standard puppeteer PDF generation...');
        return await this.generatePDFWithRetry(invoiceData, language);
      } catch (error) {
        console.error('❌ Standard puppeteer approach failed:', error.message);

        // Strategy 2: Try alternate approach with direct HTML file
        console.log('🔄 Attempting alternate HTML-to-PDF approach...');

        // Write HTML to temp file
        const tempHtmlPath = this.getTempFilePath('html');
        const tempPdfPath = tempHtmlPath.replace('.html', '.pdf');

        // Write HTML to file
        fs.writeFileSync(tempHtmlPath, this.generateHTMLTemplate(invoiceData, language));

        try {
          // Try minimal puppeteer with file approach
          const minimalist = {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
            timeout: 30000
          };          // Get Chrome path
          const chromePath = await this.findChromePath();
          if (!chromePath) {
            throw new Error('Chrome executable not found');
          }

          // Determine which puppeteer module to use
          const puppeteerToUse = puppeteerWithBrowser || puppeteer;

          // Launch browser with Chrome path
          const browser = await puppeteerToUse.launch({
            ...minimalist,
            executablePath: chromePath
          });
          const page = await browser.newPage();

          // Load from file
          await page.goto(`file://${tempHtmlPath}`, {
            waitUntil: 'networkidle0',
            timeout: 15000
          });

          // Generate PDF
          const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
              top: '0.5in',
              right: '0.5in',
              bottom: '0.5in',
              left: '0.5in'
            }
          });

          // Close browser
          await browser.close();

          // Clean up temp files
          try {
            fs.unlinkSync(tempHtmlPath);
          } catch (e) {
            console.warn(`⚠️ Failed to clean up temp HTML file: ${e.message}`);
          }

          return pdfBuffer;
        } catch (fileApproachError) {
          console.error('❌ File-based approach failed:', fileApproachError.message);

          // Strategy 3: Return HTML with print-friendly CSS
          console.log('⚠️ All PDF generation methods failed, returning HTML');

          // Read the HTML file we created earlier
          if (fs.existsSync(tempHtmlPath)) {
            const html = fs.readFileSync(tempHtmlPath, 'utf-8');

            try {
              fs.unlinkSync(tempHtmlPath);
            } catch (e) {
              // Ignore cleanup errors
            }

            return html;
          }

          // If file reading fails, generate HTML directly
          return this.generateHTMLTemplate(invoiceData, language);
        }
      }
    } catch (error) {
      console.error('❌ All fallback strategies failed:', error.message);
      return this.generateHTMLTemplate(invoiceData, language);
    }
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
        <title>${trans.invoice} - ${invoiceData.invoiceId}</title>        <style>
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
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 30px;
                background: white;
            }

            .header {
                background: ${this.primaryColor};
                color: white;
                padding: 30px;
                text-align: center;
                margin-bottom: 30px;
                border-radius: 12px;
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
                background: ${this.accentColor};
                color: white;
                padding: 15px 30px;
                text-align: center;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 30px;
                border-radius: 8px;
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
                background: #f8f9fa;
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
                background: #f8f9fa;
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
            }

            .company-info {
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
            }            /* Enhanced print styles for better reliability */
            @media print {
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                html, body {
                    width: 210mm;
                    height: 297mm;
                    margin: 0;
                    padding: 0;
                }

                .invoice-container {
                    padding: 10mm;
                    width: 190mm;
                    height: 277mm;
                    page-break-after: always;
                }

                .header {
                    background-color: ${this.primaryColor} !important;
                }

                .invoice-title {
                    background-color: ${this.accentColor} !important;
                }

                /* Force showing backgrounds */
                .payment-status {
                    border-width: 2px !important;
                }

                .status-paid {
                    background-color: #d4edda !important;
                    color: #155724 !important;
                    border-color: #c3e6cb !important;
                }

                .status-unpaid {
                    background-color: #f8d7da !important;
                    color: #721c24 !important;
                    border-color: #f5c6cb !important;
                }

                .status-pending {
                    background-color: #fff3cd !important;
                    color: #856404 !important;
                    border-color: #ffeaa7 !important;
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
  }  /**
   * Generate invoice PDF using best available method
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @returns {Promise<Buffer|string>} PDF buffer or HTML content as fallback
   */  async generateInvoicePDF(invoiceData, language = 'en') {
    try {
      // First try with fallback mechanism
      const result = await this.generatePDFWithFallback(invoiceData, language);

      // If result is a string, it's HTML content (fallback mode)
      if (typeof result === 'string') {
        console.log('⚠️ Returning HTML content instead of PDF (fallback mode)');

        // Add a clear notification banner to the HTML content
        let enhancedHtml = result;
        if (this.isVercel) {
          // Insert a notification banner after the body tag
          const bannerHtml = `
          <div style="position:fixed; top:0; left:0; right:0; background:#ff6b35; color:white; padding:8px; text-align:center; z-index:9999; font-size:14px; font-family:Arial, sans-serif;">
            ⚠️ Viewing HTML version - PDF generation is not available on this Vercel deployment
          </div>
          <div style="height:40px;"></div>`;

          enhancedHtml = result.replace('<body>', '<body>' + bannerHtml);
        }

        return Buffer.from(enhancedHtml, 'utf-8');
      }

      return result;
    } catch (error) {
      console.error('❌ All PDF generation methods failed:', error.message);

      // Ultimate fallback - generate minimal HTML
      let html = this.generateSimplifiedHTMLTemplate(invoiceData, language);

      // Add a notification to the simplified HTML as well
      if (this.isVercel || this.isServerless) {
        const fallbackNotice = `
        <div style="background:#ff6b35; color:white; padding:10px; margin:10px 0; text-align:center;">
          ⚠️ PDF generation failed - Viewing HTML fallback version
        </div>`;

        html = html.replace('<div class="invoice-box">', '<div class="invoice-box">' + fallbackNotice);
      }

      return Buffer.from(html, 'utf-8');
    }
  }

  /**
   * Generate a simplified HTML template for extreme fallback
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - Language code
   * @returns {string} Simple HTML
   */
  generateSimplifiedHTMLTemplate(invoiceData, language = 'en') {
    const isArabic = language === 'ar';
    const direction = isArabic ? 'rtl' : 'ltr';

    return `<!DOCTYPE html>
    <html lang="${language}" dir="${direction}">
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoiceData.invoiceId || ''}</title>
      <style>
        body { font-family: Arial, sans-serif; direction: ${direction}; }
        .invoice-box { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
        .header { text-align: center; margin-bottom: 20px; }
        .info-row { margin-bottom: 10px; }
        .info-label { font-weight: bold; }
        .total { font-size: 1.5em; margin-top: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <h1>Gaith Tours - ${isArabic ? 'فاتورة' : 'Invoice'}</h1>
          <p>${isArabic ? 'رقم الفاتورة' : 'Invoice'} #${invoiceData.invoiceId || ''}</p>
        </div>

        <div class="info-row">
          <span class="info-label">${isArabic ? 'الاسم الكامل' : 'Name'}:</span>
          ${invoiceData.clientName || invoiceData.touristName || ''}
        </div>

        <div class="info-row">
          <span class="info-label">${isArabic ? 'الفندق' : 'Hotel'}:</span>
          ${invoiceData.hotelName || ''}
        </div>

        <div class="info-row">
          <span class="info-label">${isArabic ? 'تاريخ الوصول' : 'Check-in'}:</span>
          ${invoiceData.checkInDate || ''}
        </div>

        <div class="info-row">
          <span class="info-label">${isArabic ? 'تاريخ المغادرة' : 'Check-out'}:</span>
          ${invoiceData.checkOutDate || ''}
        </div>

        <div class="total">
          ${isArabic ? 'المجموع' : 'Total'}:
          ${invoiceData.amount || '0'} ${isArabic ? 'ريال سعودي' : 'SAR'}
        </div>
      </div>
    </body>
    </html>`;
  }

  /**
   * Generate invoice PDF and save to file using best available method
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @param {string} outputPath - Output file path
   * @returns {Promise<boolean>} Success status
   */
  async generateInvoicePDFToFile(invoiceData, language = 'en', outputPath) {
    try {
      // First try with puppeteer
      const result = await this.generatePDFWithRetry(invoiceData, language, outputPath);
      return result;
    } catch (error) {
      console.error('❌ PDF generation to file failed:', error.message);

      // Fallback - write HTML to file
      try {
        const html = this.generateHTMLTemplate(invoiceData, language);
        const htmlPath = outputPath.replace(/\.pdf$/i, '.html');

        fs.writeFileSync(htmlPath, html);
        console.log(`✅ Fallback HTML saved to: ${htmlPath}`);

        return false; // Indicate PDF generation failed, but HTML was saved
      } catch (htmlError) {
        console.error('❌ HTML fallback also failed:', htmlError.message);
        throw error; // Re-throw the original error
      }
    }
  }

  /**
   * Check if system has necessary dependencies for Chromium
   * @returns {Promise<boolean>} Whether the system appears to have required dependencies
   */
  async checkSystemCompatibility() {
    // Skip check on Windows as dependencies are usually bundled
    if (process.platform === 'win32') {
      return true;
    }

    try {
      // Try a simple command to check if we're in a container/limited environment
      const memInfo = await this.executeCommand('cat /proc/meminfo || free -m || vm_stat');

      // Check memory - need at least 1GB free for browser
      const memLines = memInfo.split('\n');
      let freeMemMB = 0;

      for (const line of memLines) {
        if (line.includes('MemFree') || line.includes('MemAvailable')) {
          const matches = line.match(/\d+/);
          if (matches && matches[0]) {
            freeMemMB = parseInt(matches[0], 10) / 1024;
            break;
          }
        } else if (line.includes('free')) {
          const parts = line.split(/\s+/).filter(Boolean);
          if (parts.length >= 4) {
            freeMemMB = parseInt(parts[3], 10);
            break;
          }
        }
      }

      console.log(`🧪 System has approximately ${Math.round(freeMemMB)}MB free memory`);

      if (freeMemMB < 768) {
        console.warn('⚠️ System has less than 768MB free memory, PDF generation may fail');
        return false;
      }

      return true;
    } catch (error) {
      console.warn(`⚠️ System compatibility check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute a command as a promise
   * @param {string} command - Command to execute
   * @returns {Promise<string>} Command output
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      const proc = spawn(process.platform === 'win32' ? 'powershell.exe' : 'sh',
                        [process.platform === 'win32' ? '-Command' : '-c', command]);

      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Generate a unique temporary file path
   * @param {string} extension - File extension
   * @returns {string} Temporary file path
   */
  getTempFilePath(extension = 'html') {
    const randomStr = crypto.randomBytes(8).toString('hex');
    return path.join(os.tmpdir(), `invoice-${randomStr}.${extension}`);
  }

  /**
   * Minimal PDF generation with fewer options
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - Language code
   * @param {string} outputPath - Optional output path
   * @returns {Promise<Buffer|boolean>} PDF buffer or success status
   */
  async generatePDFMinimal(invoiceData, language = 'en', outputPath = null) {
    await this.waitForSlot();

    let browser = null;
    let page = null;

    try {      // Get Chrome path
      const chromePath = await this.findChromePath();
      if (!chromePath) {
        throw new Error('Chrome executable not found');
      }

      console.log(`🚀 Launching Chrome minimal mode from: ${chromePath}`);

      // Determine which puppeteer module to use
      const puppeteerToUse = puppeteerWithBrowser || puppeteer;

      // Super minimal browser options
      browser = await puppeteerToUse.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ],
        executablePath: chromePath,
        headless: true,
        timeout: 30000
      });

      // Create new page
      page = await browser.newPage();

      // Simple viewport
      await page.setViewport({ width: 800, height: 1100 });

      // Generate HTML content
      const htmlContent = this.generateHTMLTemplate(invoiceData, language);

      // Set content with minimal options
      await page.setContent(htmlContent, {
        waitUntil: 'load',
        timeout: 20000
      });

      // Simple wait
      await new Promise(resolve => setTimeout(resolve, 1000));

      // PDF options
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
      };

      // Generate PDF
      if (outputPath) {
        await page.pdf({
          ...pdfOptions,
          path: outputPath
        });
        return true;
      } else {
        const pdfBuffer = await page.pdf(pdfOptions);
        return pdfBuffer;
      }
    } catch (error) {
      console.error(`❌ Minimal PDF generation failed: ${error.message}`);
      throw error;
    } finally {
      // Clean up resources
      if (page) {
        try { await page.close().catch(() => {}); } catch (e) {}
      }
      if (browser) {
        try { await browser.close().catch(() => {}); } catch (e) {}
      }
      this.releaseSlot();
    }
  }

  /**
   * Generate PDF from file - more reliable in some environments
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - Language code
   * @param {string} outputPath - Optional output path
   * @returns {Promise<Buffer|boolean>} PDF buffer or success status
   */
  async generatePDFFromFile(invoiceData, language = 'en', outputPath = null) {
    await this.waitForSlot();

    let browser = null;
    let page = null;
    let tempFile = null;

    try {
      // Create temporary HTML file
      tempFile = this.getTempFilePath('html');
      const html = this.generateHTMLTemplate(invoiceData, language);
      fs.writeFileSync(tempFile, html);      // Get Chrome path
      const chromePath = await this.findChromePath();
      if (!chromePath) {
        throw new Error('Chrome executable not found');
      }

      console.log(`🚀 Launching Chrome file-based mode from: ${chromePath}`);

      // Determine which puppeteer module to use
      const puppeteerToUse = puppeteerWithBrowser || puppeteer;

      // Super minimal browser
      browser = await puppeteerToUse.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: chromePath,
        headless: true,
        timeout: 25000
      });

      // Create page
      page = await browser.newPage();

      // Load from file
      await page.goto(`file://${tempFile}`, {
        waitUntil: 'networkidle0',
        timeout: 15000
      });

      // Generate PDF
      if (outputPath) {
        await page.pdf({
          path: outputPath,
          format: 'A4',
          printBackground: true,
          margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        });
        return true;
      } else {
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        });
        return pdfBuffer;
      }
    } catch (error) {
      console.error(`❌ File-based PDF generation failed: ${error.message}`);
      throw error;
    } finally {
      // Clean up resources
      if (tempFile) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      if (page) {
        try { await page.close().catch(() => {}); } catch (e) {}
      }
      if (browser) {
        try { await browser.close().catch(() => {}); } catch (e) {}
      }
      this.releaseSlot();
    }
  }
  /**
   * Check if Chrome is installed and get its path
   * @returns {Promise<string|null>} Path to Chrome executable or null if not found
   */
  async findChromePath() {
    // Cache the result to avoid multiple checks
    if (this.chromePath !== undefined) {
      return this.chromePath;
    }

    try {
      // For Vercel or serverless environments, use specialized detection first
      if (this.isVercel || this.isServerless) {
        console.log('🔍 Looking for Chrome in serverless environment...');
        const serverlessChrome = await this.detectVercelChrome();
        if (serverlessChrome) {
          this.chromePath = serverlessChrome;
          return this.chromePath;
        }

        console.log('⚠️ No serverless-specific Chrome installation found');
      }

      // Try to detect standard installed Chrome
      const possiblePaths = await this.detectInstalledChrome();
      if (possiblePaths && possiblePaths.length > 0) {
        // Use the first found path
        this.chromePath = possiblePaths[0];
        console.log(`✅ Found Chrome at: ${this.chromePath}`);
        return this.chromePath;
      }

      // Try to use puppeteer's bundled Chromium if available
      if (puppeteerWithBrowser) {
        try {
          console.log('🔍 Trying to use Puppeteer\'s bundled Chromium...');
          const browserFetcher = puppeteerWithBrowser.createBrowserFetcher();
          const revisionInfo = await browserFetcher.download('latest');
          if (revisionInfo && revisionInfo.executablePath) {
            this.chromePath = revisionInfo.executablePath;
            console.log(`✅ Using Puppeteer's bundled Chromium: ${this.chromePath}`);
            return this.chromePath;
          }
        } catch (e) {
          console.warn(`⚠️ Failed to download Chromium: ${e.message}`);
        }
      }

      // Chrome not found
      console.warn('⚠️ Chrome not found on system');
      this.chromePath = null;
      return null;
    } catch (error) {
      console.error(`❌ Error finding Chrome: ${error.message}`);
      this.chromePath = null;
      return null;
    }
  }

  /**
   * Detect installed Chrome on various platforms
   * @returns {Promise<string[]>} Array of possible Chrome paths
   */  async detectInstalledChrome() {
    const platform = process.platform;
    const possiblePaths = [];

    if (platform === 'win32') {
      // Windows paths
      const programFiles = [
        process.env['PROGRAMFILES(X86)'],
        process.env.PROGRAMFILES,
        process.env.LOCALAPPDATA,
        process.env.PROGRAMDATA
      ].filter(Boolean);

      const suffixes = [
        'Google/Chrome/Application/chrome.exe',
        'Google/Chrome Beta/Application/chrome.exe',
        'Google/Chrome Canary/Application/chrome.exe',
        'Google/Chrome Dev/Application/chrome.exe',
        'Microsoft/Edge/Application/msedge.exe',
        'chrome-win/chrome.exe', // Puppeteer's chromium location
        'Chrome/Application/chrome.exe' // Alternative path
      ];

      // Check direct paths first (common installations)
      const directPaths = [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
      ];

      // Add direct paths first as they're most common
      for (const path of directPaths) {
        try {
          if (fs.existsSync(path)) {
            possiblePaths.push(path);
          }
        } catch (e) {
          // Ignore access errors
        }
      }

      // Then check all program folders
      for (const prefix of programFiles) {
        if (!prefix) continue;
        for (const suffix of suffixes) {
          try {
            // Use path.join for proper Windows path handling
            const chromePath = path.join(prefix, suffix.replace(/\//g, '\\'));
            if (fs.existsSync(chromePath)) {
              possiblePaths.push(chromePath);
            }
          } catch (e) {
            // Ignore access errors
          }
        }
      }
        // Try Windows registry query as last resort
      try {
        // Use PowerShell to query the registry for Chrome path
        const regQuery = await this.executeCommand(
          'powershell -Command "Get-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe\' -Name Path -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path"'
        );

        if (regQuery && regQuery.trim()) {
          const regPath = path.join(regQuery.trim(), 'chrome.exe');
          if (fs.existsSync(regPath)) {
            possiblePaths.push(regPath);
          }
        }
      } catch (e) {
        // Ignore registry query errors
      }
    } else if (platform === 'darwin') {
      // macOS paths
      const paths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      ];

      for (const path of paths) {
        if (fs.existsSync(path)) {
          possiblePaths.push(path);
        }
      }
    } else {
      // Linux paths
      const paths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/usr/bin/microsoft-edge'
      ];

      for (const path of paths) {
        if (fs.existsSync(path)) {
          possiblePaths.push(path);
        }
      }

      // Try using which command
      try {
        const chromePath = (await this.executeCommand('which google-chrome || which chromium || which chromium-browser')).trim();
        if (chromePath && fs.existsSync(chromePath)) {
          possiblePaths.push(chromePath);
        }
      } catch (e) {
        // Ignore command errors
      }
    }

    return possiblePaths;
  }

  /**
   * Special Chrome detection for Vercel and serverless environments
   * @returns {Promise<string|null>} Chrome executable path if found
   */
  async detectVercelChrome() {
    // Common paths in serverless environments where Chrome might be installed
    const serverlessPaths = [
      // AWS Lambda and Vercel potential locations
      '/opt/bin/chromium',
      '/opt/bin/chromium-browser',
      '/opt/chrome/chrome',
      '/opt/chrome-linux/chrome',
      '/opt/chrome/headless-chromium',
      '/tmp/chromium',
      '/tmp/chrome',
      '/layers/chrome-aws-lambda/bin/chromium',
      // For custom Lambda Layers
      '/opt/chrome-aws-lambda/bin/chromium',
      '/var/task/node_modules/chromium/bin/chromium',
      '/var/task/node_modules/chrome-aws-lambda/bin/chromium'
    ];

    // Check all paths
    for (const chromePath of serverlessPaths) {
      try {
        if (fs.existsSync(chromePath)) {
          // Test if the file is executable
          try {
            fs.accessSync(chromePath, fs.constants.X_OK);
            console.log(`✅ Found serverless Chrome at: ${chromePath}`);
            return chromePath;
          } catch (e) {
            console.warn(`⚠️ Found Chrome at ${chromePath} but it is not executable`);
          }
        }
      } catch (e) {
        // Ignore errors checking file existence
      }
    }

    // Look for environment variable configurations
    if (process.env.CHROME_EXECUTABLE_PATH) {
      const chromePath = process.env.CHROME_EXECUTABLE_PATH;
      try {
        if (fs.existsSync(chromePath)) {
          console.log(`✅ Found Chrome from CHROME_EXECUTABLE_PATH: ${chromePath}`);
          return chromePath;
        } else {
          console.warn(`⚠️ CHROME_EXECUTABLE_PATH set but not found: ${chromePath}`);
        }
      } catch (e) {
        console.warn(`⚠️ Error checking CHROME_EXECUTABLE_PATH: ${e.message}`);
      }
    }

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      try {
        if (fs.existsSync(chromePath)) {
          console.log(`✅ Found Chrome from PUPPETEER_EXECUTABLE_PATH: ${chromePath}`);
          return chromePath;
        }
      } catch (e) {
        // Ignore errors
      }
    }

    return null;
  }

  /**
   * Try to install Chrome using npm
   * @returns {Promise<boolean>} Whether the installation was successful
   */
  async tryInstallChrome() {
    try {
      console.log('🔄 Attempting to install Chromium via Puppeteer...');

      // Check if we have write access to the npm directory
      const canWriteToNpm = await this.checkNpmWriteAccess();
      if (!canWriteToNpm) {
        console.warn('⚠️ No write access to npm directories, skipping Chrome installation');
        return false;
      }

      // Try to install puppeteer which includes Chromium
      await this.executeCommand('npm install puppeteer --no-save');

      // Verify installation
      try {
        // Re-require puppeteer after installation
        delete require.cache[require.resolve('puppeteer')];
        puppeteerWithBrowser = require('puppeteer');

        // Try to get executable path
        const browserFetcher = puppeteerWithBrowser.createBrowserFetcher();
        const revisionInfo = browserFetcher.revisionInfo('latest');

        if (revisionInfo && revisionInfo.executablePath && fs.existsSync(revisionInfo.executablePath)) {
          this.chromePath = revisionInfo.executablePath;
          console.log(`✅ Successfully installed Chromium at: ${this.chromePath}`);
          return true;
        }
      } catch (e) {
        console.warn(`⚠️ Failed to verify Chromium installation: ${e.message}`);
      }

      return false;
    } catch (error) {
      console.error(`❌ Failed to install Chrome: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if we have write access to npm directories
   * @returns {Promise<boolean>} Whether we have write access
   */
  async checkNpmWriteAccess() {
    try {
      // Get npm root directory
      const npmRoot = await this.executeCommand('npm root -g');
      if (!npmRoot) {
        return false;
      }

      // Try to write a temporary file
      const testFile = path.join(os.tmpdir(), `test-npm-write-${Date.now()}.txt`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      return true;
    } catch (e) {
      return false;
    }
  }
}

// Initialize the browser detection when the module is loaded
HTMLToPDFInvoiceGenerator.initialize()
  .then(isAvailable => {
    console.log(`PDF generator initialization complete. PDF generation available: ${isAvailable ? 'YES' : 'NO'}`);
  })
  .catch(err => {
    console.warn(`PDF generator initialization failed: ${err.message}`);
  });

module.exports = HTMLToPDFInvoiceGenerator;
