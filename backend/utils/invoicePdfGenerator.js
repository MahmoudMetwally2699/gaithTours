const HTMLToPDFInvoiceGenerator = require('./htmlToPdfInvoiceGenerator');

/**
 * Invoice PDF Generator using HTML-to-PDF for perfect Arabic support
 * This class acts as a wrapper to maintain compatibility with existing code
 */
class InvoicePDFGenerator {
  constructor() {
    this.htmlToPdfGenerator = new HTMLToPDFInvoiceGenerator();
  }

  /**
   * Generate invoice PDF buffer using HTML-to-PDF approach
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateInvoicePDF(invoiceData, language = 'en') {
    try {
      console.log(`🔄 Generating invoice PDF using HTML-to-PDF approach (${language})`);
      return await this.htmlToPdfGenerator.generateInvoicePDF(invoiceData, language);
    } catch (error) {
      console.error('❌ Error generating invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Generate invoice PDF and save to file
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @param {string} outputPath - Output file path
   * @returns {Promise<boolean>} Success status
   */
  async generateInvoicePDFToFile(invoiceData, language = 'en', outputPath) {
    try {
      console.log(`🔄 Generating invoice PDF to file using HTML-to-PDF approach (${language})`);
      return await this.htmlToPdfGenerator.generateInvoicePDFToFile(invoiceData, language, outputPath);
    } catch (error) {
      console.error('❌ Error generating invoice PDF to file:', error);
      throw error;
    }
  }
}

module.exports = InvoicePDFGenerator;
