const crypto = require('crypto');

const slugify = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function generateUniqueReferralCode(customerModel, name = 'user') {
  const base = slugify(name).slice(0, 12) || 'user';
  for (let i = 0; i < 5; i++) {
    const short = crypto.randomBytes(2).toString('hex'); // 4 chars
    const code = `${base}-${short}`;
    const exists = await customerModel
      .findOne({ referralCode: code })
      .collation({ locale: 'en', strength: 2 });
    if (!exists) return code;
  }
  return crypto.randomBytes(4).toString('hex');
}

const validateAlias = (code) => /^[a-z0-9\-]{3,30}$/.test((code || '').toString());

module.exports = { generateUniqueReferralCode, validateAlias };