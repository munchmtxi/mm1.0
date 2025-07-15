// taxMiddleware.js
// Middleware for validating tax-related requests.

'use strict';

const { calculateTaxSchema, generateTaxReportSchema, updateTaxSettingsSchema, ensureTaxComplianceSchema } = require('@validators/merchant/wallet/taxValidator');

async function validateCalculateTax(req, res, next) {
  try {
    await calculateTaxSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateGenerateTaxReport(req, res, next) {
  try {
    await generateTaxReportSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false,<Action: I apologize for the incomplete response. Let me continue and provide the full set of files and updates as requested.

---

### Middleware File: `taxMiddleware.js` (Continued)

**Path**: `C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\middleware\merchant\wallet\taxMiddleware.js`

```javascript
// taxMiddleware.js
// Middleware for validating tax-related requests.

'use strict';

const { calculateTaxSchema, generateTaxReportSchema, updateTaxSettingsSchema, ensureTaxComplianceSchema } = require('@validators/merchant/wallet/taxValidator');

async function validateCalculateTax(req, res, next) {
  try {
    await calculateTaxSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateGenerateTaxReport(req, res, next) {
  try {
    await generateTaxReportSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateUpdateTaxSettings(req, res, next) {
  try {
    await updateTaxSettingsSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateEnsureTaxCompliance(req, res, next) {
  try {
    await ensureTaxComplianceSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateCalculateTax,
  validateGenerateTaxReport,
  validateUpdateTaxSettings,
  validateEnsureTaxCompliance,
};