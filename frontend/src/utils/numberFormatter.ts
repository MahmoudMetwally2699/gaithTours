/**
 * Converts Western numerals to Arabic-Indic numerals
 * @param num - The number or string to convert
 * @returns String with Arabic numerals
 */
export const toArabicNumerals = (num: string | number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)])
    .replace('.', '٫'); // Replace decimal point with Arabic decimal separator
};

/**
 * Formats a number for display based on language
 * @param num - The number to format
 * @param isArabic - Whether to use Arabic numerals
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string
 */
export const formatNumber = (num: number, isArabic: boolean, decimals: number = 1): string => {
  const formatted = num.toFixed(decimals);
  return isArabic ? toArabicNumerals(formatted) : formatted;
};

/**
 * Formats text that may contain numbers for Arabic display
 * @param text - The text to format
 * @param isArabic - Whether to convert numbers to Arabic numerals
 * @returns Formatted text
 */
export const formatTextWithNumbers = (text: string, isArabic: boolean): string => {
  return isArabic ? toArabicNumerals(text) : text;
};
