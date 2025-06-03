/**
 * taxConstants.js
 *
 * Defines constants for tax calculations and compliance for the Munch service.
 * Aligns with paymentConstants.js and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

'use strict';

module.exports = {
  SUPPORTED_PERIODS: ['monthly', 'quarterly'],
  SUPPORTED_FILING_FREQUENCIES: ['monthly', 'quarterly', 'none'],
  DEFAULT_TAX_RATE: 10,
  TAX_RATES: {
    'PH': { rate: 12, requirements: ['tax_registration', 'annual_filing'] },
    'EU': { rate: 20, requirements: ['tax_registration', 'vat_registration'] },
    'CA': { rate: 13, requirements: ['tax_registration', 'annual_filing'] },
    'AU': { rate: 10, requirements: ['tax_registration', 'gst_registration'] },
    'UK': { rate: 20, requirements: ['tax_registration', 'vat_registration'] },
    'MW': { rate: 16.5, requirements: ['tax_registration', 'annual_filing'] },
    'TZ': { rate: 18, requirements: ['tax_registration', 'vat_registration'] },
    'KE': { rate: 16, requirements: ['tax_registration', 'annual_filing'] },
    'MZ': { rate: 17, requirements: ['tax_registration', 'annual_filing'] },
    'NG': { rate: 7.5, requirements: ['tax_registration', 'vat_registration'] },
    'ZA': { rate: 15, requirements: ['tax_registration', 'vat_registration'] },
    'IN': { rate: 18, requirements: ['tax_registration', 'gst_registration'] },
    'BR': { rate: 17, requirements: ['tax_registration', 'annual_filing'] }
  },
  ERROR_CODES: ['INVALID_PERIOD', 'INVALID_FILING_FREQUENCY', 'MERCHANT_NOT_FOUND', 'WALLET_NOT_FOUND']
};