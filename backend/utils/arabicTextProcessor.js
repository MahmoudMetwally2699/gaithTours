/**
 * Arabic Text Processor for PDFs
 * Handles proper Arabic text shaping, bidirectional text, and RTL layout
 * Optimized for PDF rendering engines like jsPDF
 */

const arabicReshaper = require('arabic-reshaper');
const bidiFactory = require('bidi-js');
const bidi = bidiFactory(); // Initialize bidi processor

class ArabicTextProcessor {
  constructor() {
    // Arabic character ranges for detection
    this.arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

    // Bidirectional algorithm categories
    this.rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  }

  /**
   * Check if text contains Arabic characters
   * @param {string} text
   * @returns {boolean}
   */
  hasArabic(text) {
    return this.arabicRegex.test(text);
  }  /**
   * Process Arabic text for proper display in PDF
   * @param {string} text
   * @returns {string}
   */
  processArabicText(text) {
    if (!text || typeof text !== 'string') {
      return text || '';
    }

    // If no Arabic characters, return as-is
    if (!this.hasArabic(text)) {
      // For numeric values, we still need to consider RTL context
      if (this.isNumeric(text)) {
        return text; // Numbers don't need reshaping but might need directional handling
      }
      return text;
    }

    try {
      // Special handling for mixed content (Arabic + numbers/Latin)
      const isMixed = this.containsNonArabic(text);

      // Process purely numeric content differently
      if (this.isNumeric(text)) {
        return text; // Return numbers as-is
      }

      // First, apply Arabic reshaping for proper glyph formation with best options for PDF
      let processedText = arabicReshaper.convertArabic(text, {
        letterForms: 'connected',  // Ensures Arabic letters connect properly
        joinConsecutive: true,     // Keep consecutive Arabic words connected
        ligatures: true            // Enable ligature support
      });

      // Apply the Unicode Bidirectional Algorithm using bidi-js
      const embeddingLevels = bidi.getEmbeddingLevels(processedText, 'rtl');

      // Get character reordering segments
      const reorderSegments = bidi.getReorderSegments(
        processedText,
        embeddingLevels
      );

      // Apply reordering if needed
      if (reorderSegments.length > 0) {
        // Convert to array for easier manipulation
        const chars = processedText.split('');

        // Apply each reordering segment
        reorderSegments.forEach(([start, end]) => {
          // Reverse this segment
          const segment = chars.slice(start, end + 1);
          segment.reverse();
          for (let i = start; i <= end; i++) {
            chars[i] = segment[i - start];
          }
        });

        // Get mirrored characters (parentheses etc.)
        const mirrored = bidi.getMirroredCharactersMap(processedText, embeddingLevels);
        if (mirrored.size > 0) {
          mirrored.forEach((replacement, index) => {
            chars[index] = replacement;
          });
        }

        processedText = chars.join('');
      }

      return processedText;
    } catch (error) {
      console.warn('Error processing Arabic text:', error.message);
      return text; // Return original text if processing fails
    }
  }

  /**
   * Check if text is purely numeric
   * @param {string} text
   * @returns {boolean}
   */
  isNumeric(text) {
    // Check if string contains only numbers, periods, commas, and spaces
    return /^[\d\s.,+-]+$/.test(text.trim());
  }

  /**
   * Check if text contains non-Arabic characters (like numbers or Latin)
   * @param {string} text
   * @returns {boolean}
   */
  containsNonArabic(text) {
    // If has Arabic and also has other characters
    return this.hasArabic(text) && /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s.,]+/.test(text);
  }

  /**
   * Check if text contains Latin characters
   * @param {string} text
   * @returns {boolean}
   */
  hasLatin(text) {
    return /[a-zA-Z]/.test(text);
  }

  /**
   * Apply bidirectional text ordering (simplified implementation)
   * @param {string} text
   * @returns {string}
   */
  applyBidirectionalOrder(text) {
    // Split text into tokens (words, numbers, punctuation)
    const tokens = this.tokenizeText(text);

    // Process each token and determine its direction
    const processedTokens = tokens.map(token => ({
      text: token,
      isRTL: this.isRTLText(token),
      isNumber: this.isNumber(token),
      isPunctuation: this.isPunctuation(token)
    }));

    // Apply bidirectional reordering
    return this.reorderTokens(processedTokens);
  }

  /**
   * Tokenize text into meaningful units
   * @param {string} text
   * @returns {Array<string>}
   */
  tokenizeText(text) {
    // Split by spaces but keep the spaces
    return text.split(/(\s+)/).filter(token => token.length > 0);
  }

  /**
   * Check if token is RTL text
   * @param {string} token
   * @returns {boolean}
   */
  isRTLText(token) {
    return this.rtlChars.test(token);
  }

  /**
   * Check if token is a number
   * @param {string} token
   * @returns {boolean}
   */
  isNumber(token) {
    return /^[\d\u06F0-\u06F9\u0660-\u0669]+$/.test(token.trim());
  }

  /**
   * Check if token is punctuation
   * @param {string} token
   * @returns {boolean}
   */
  isPunctuation(token) {
    return /^[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/.test(token);
  }

  /**
   * Reorder tokens according to bidirectional algorithm
   * @param {Array} tokens
   * @returns {string}
   */
  reorderTokens(tokens) {
    const result = [];
    let rtlSequence = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.isRTL) {
        // Add to RTL sequence
        rtlSequence.push(token.text);
      } else {
        // If we have an RTL sequence, reverse it and add to result
        if (rtlSequence.length > 0) {
          result.push(...rtlSequence.reverse());
          rtlSequence = [];
        }

        // Add LTR token
        result.push(token.text);
      }
    }

    // Handle any remaining RTL sequence
    if (rtlSequence.length > 0) {
      result.push(...rtlSequence.reverse());
    }

    return result.join('');
  }

  /**
   * Convert Arabic-Indic digits to Western digits or vice versa
   * @param {string} text
   * @param {boolean} toWestern - Convert to Western digits (0-9)
   * @returns {string}
   */
  convertDigits(text, toWestern = true) {
    if (!text) return text;

    if (toWestern) {
      // Convert Arabic-Indic digits to Western
      return text
        .replace(/[\u06F0-\u06F9]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x06F0 + 0x0030))
        .replace(/[\u0660-\u0669]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x0660 + 0x0030));
    } else {
      // Convert Western digits to Arabic-Indic
      return text.replace(/[0-9]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x0030 + 0x06F0));
    }
  }
  /**
   * Prepare text for PDF rendering with proper direction and shaping
   * @param {string} text
   * @param {boolean} forceRTL - Force RTL direction even for mixed content
   * @param {object} options - Additional options for PDF rendering
   * @returns {object}
   */
  prepareForPDF(text, forceRTL = false, options = {}) {
    if (!text) {
      return {
        text: '',
        isRTL: false,
        hasArabic: false,
        align: 'left'
      };
    }

    const hasArabic = this.hasArabic(text);
    const hasLatin = this.hasLatin(text);
    const isMixed = hasArabic && hasLatin;

    // Process the text with Arabic reshaping and bidirectional algorithm
    const processedText = hasArabic ? this.processArabicText(text) : text;

    // Determine text direction - if it has Arabic or is forced to RTL
    const isRTL = hasArabic || forceRTL;

    // Determine text alignment - Arabic text typically uses right alignment
    // If mixed, we keep the alignment based on the main direction
    const align = options.align || (isRTL ? 'right' : 'left');

    // For jsPDF specifically, we need to reverse the string for RTL text
    // Only if it's pure Arabic text (no mixed content)
    const needsReverse = isRTL && !isMixed && !options.noReverse;
    const finalText = needsReverse ? this.reverseString(processedText) : processedText;

    return {
      text: finalText,
      isRTL: isRTL,
      hasArabic: hasArabic,
      isMixed: isMixed,
      align: align
    };
  }

  /**
   * Reverse a string character by character
   * @param {string} str
   * @returns {string}
   */  reverseString(str) {
    return str.split('').reverse().join('');
  }
    /**
   * Process text specifically for jsPDF
   * jsPDF has specific requirements for RTL text
   *
   * @param {string} text - The text to process
   * @param {string} language - 'ar' for Arabic, 'en' for English
   * @param {object} options - Additional options
   * @returns {object} - Processed text and rendering options
   */
  processForJsPDF(text, language = 'en', options = {}) {
    const isArabic = language === 'ar';

    if (!text || !isArabic) {
      return {
        text,
        options: { align: 'left', R2L: false }
      };
    }

    // First check if the text contains Arabic characters
    if (!this.hasArabic(text)) {
      return {
        text,
        options: { align: 'left', R2L: false }
      };
    }

    // Process the text with all our Arabic shaping logic
    const processedText = this.processArabicText(text);

    // For jsPDF, we need to use their R2L flag and align options
    return {
      text: processedText,
      options: {
        align: 'right',
        R2L: true
      }
    };
  }
}

module.exports = ArabicTextProcessor;
