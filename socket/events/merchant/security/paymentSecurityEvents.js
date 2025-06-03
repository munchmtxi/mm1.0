// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\socket\events\merchant\security\paymentSecurityEvents.js
'use strict';

module.exports = {
  EVENT_TYPES: {
    PAYMENT_TOKENIZED: 'payment:tokenized',
    MFA_ENFORCED: 'mfa:enforced',
    FRAUD_DETECTED: 'fraud:detected',
    GAMIFICATION_TRACKED: 'security:gamification',
  },
  SETTINGS: {
    DEFAULT_LANGUAGE: 'en',
  },
};