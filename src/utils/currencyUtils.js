/**
 * Currency utility functions for consistent formatting across the app
 */

/**
 * Format amount as Indian Rupee (INR) currency
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show the currency symbol (default: true)
 * @param {number} decimalPlaces - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, showSymbol = true, decimalPlaces = 2) => {
  if (amount === null || amount === undefined) return showSymbol ? `₹${(0).toFixed(decimalPlaces)}` : (0).toFixed(decimalPlaces);

  const numAmount = Number(amount);
  if (isNaN(numAmount)) return showSymbol ? `₹${(0).toFixed(decimalPlaces)}` : (0).toFixed(decimalPlaces);

  if (showSymbol) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(numAmount);
  } else {
    return numAmount.toLocaleString('en-IN', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
  }
};

/**
 * Format amount for input fields (without currency symbol)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted number string
 */
export const formatAmountForInput = (amount) => {
  return formatCurrency(amount, false);
};

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed amount
 */
export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;

  // Remove currency symbol, commas, and whitespace
  const cleanString = currencyString.toString().replace(/[₹,\s]/g, '');
  const amount = parseFloat(cleanString);

  return isNaN(amount) ? 0 : amount;
};

/**
 * Get currency symbol
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = () => '₹';

/**
 * Get currency code
 * @returns {string} Currency code
 */
export const getCurrencyCode = () => 'INR';

/**
 * Format large amounts with appropriate suffix (K, L, Cr)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted amount with suffix
 */
export const formatLargeAmount = (amount) => {
  if (!amount || amount === 0) return '₹0';

  const numAmount = Math.abs(amount);
  const isNegative = amount < 0;
  const prefix = isNegative ? '-₹' : '₹';

  if (numAmount >= 10000000) { // 1 Crore
    return `${prefix}${(numAmount / 10000000).toFixed(1)}Cr`;
  } else if (numAmount >= 100000) { // 1 Lakh
    return `${prefix}${(numAmount / 100000).toFixed(1)}L`;
  } else if (numAmount >= 1000) { // 1 Thousand
    return `${prefix}${(numAmount / 1000).toFixed(1)}K`;
  } else {
    return formatCurrency(amount);
  }
};

export default {
  formatCurrency,
  formatAmountForInput,
  parseCurrency,
  getCurrencySymbol,
  getCurrencyCode,
  formatLargeAmount
};