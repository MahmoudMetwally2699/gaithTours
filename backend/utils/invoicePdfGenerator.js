const JsPDFInvoiceGenerator = require('./jspdfInvoiceGenerator');

/**
 * Invoice PDF Generator using jsPDF for perfect Arabic support
 * This class acts as a wrapper to maintain compatibility with existing code
 * while using the more reliable jsPDF-based generator for better Arabic text rendering
 */
class InvoicePDFGenerator {
  constructor() {
    this.jsPdfGenerator = new JsPDFInvoiceGenerator();
  }

  /**
   * Generate invoice PDF buffer using jsPDF approach
   * @param {Object} invoiceData - Invoice data
   * @param {string} language - 'en' or 'ar'
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateInvoicePDF(invoiceData, language = 'en') {
    try {
      return await this.jsPdfGenerator.generateInvoicePDF(invoiceData, language);
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
      return await this.jsPdfGenerator.generateInvoicePDFToFile(invoiceData, language, outputPath);
    } catch (error) {
      console.error('❌ Error generating invoice PDF to file:', error);
      throw error;
    }
  }
}

module.exports = InvoicePDFGenerator;
