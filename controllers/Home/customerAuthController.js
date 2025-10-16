const customerModel = require("../../models/customerModel")
const bcrypt = require('bcrypt')
const { responseReturn } = require("../../utils/response");
const sellerCustomerModel = require("../../models/chat/sellerCustomerModel");
const createToken = require("../../utils/tokenCreate");
const referralEventModel = require("../../models/referralEventModel");
const { generateUniqueReferralCode, validateAlias } = require('../../utils/referral');

const REFERRAL_THRESHOLD = 10;
const REFERRAL_REWARD = 1;
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:5173';

class customerAuthController {

  customer_register = async (req, res) => {
    const { name, email, password, referralCode } = req.body;
    const refFromQuery = (req.query?.ref || referralCode || req.cookies?.ref || '').toString().trim().toLowerCase();

    try {
      const customer = await customerModel.findOne({ email })
      if (customer) {
        return responseReturn(res, 404, { error: 'Email already exits' })
      }

      // Find referrer if ref code provided
      let referrer = null;
      if (refFromQuery) {
        referrer = await customerModel
          .findOne({ referralCode: refFromQuery })
          .collation({ locale: 'en', strength: 2 });
      }

      const createCustomer = await customerModel.create({
        name: name.trim(),
        email: email.trim(),
        password: await bcrypt.hash(password, 10),
        method: 'menualy',
        referredBy: referrer?._id || null,
        referralCode: await generateUniqueReferralCode(customerModel, name)
      })

      await sellerCustomerModel.create({ myId: createCustomer.id })

      // Track referral + reward
      if (referrer && String(referrer._id) !== String(createCustomer._id)) {
        try {
          await referralEventModel.create({
            referrerId: referrer._id,
            referredUserId: createCustomer._id,
            source: 'link'
          });

          const oldTotal = referrer?.referralStats?.totalSignups || 0;
          const newTotal = oldTotal + 1;
          const additionalPaid = Math.max(0, newTotal - Math.max(oldTotal, REFERRAL_THRESHOLD));
          const inc = { 'referralStats.totalSignups': 1 };
          if (additionalPaid > 0) inc['referralBalance'] = additionalPaid * REFERRAL_REWARD;
          await customerModel.findByIdAndUpdate(referrer._id, { $inc: inc });
        } catch (e) {
          console.warn('referral event error:', e.message);
        }
      }

      const token = await createToken({
        id: createCustomer.id,
        name: createCustomer.name,
        email: createCustomer.email,
        method: createCustomer.method
        // role: 'customer' // চাইলে দিন
      })

      // cookie ঐচ্ছিক; আপনার ফ্লো localStorage token-based
      res.cookie('customerToken', token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      return responseReturn(res, 201, { message: 'Register success', token })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Server error' })
    }
  }

  customer_login = async (req, res) => {
    const { email, password } = req.body
    try {
      const customer = await customerModel.findOne({ email }).select('+password')
      if (customer) {
        const match = await bcrypt.compare(password, customer.password)
        if (match) {
          const token = await createToken({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            method: customer.method
            // role: 'customer'
          })
          res.cookie('customerToken', token, {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          })
          return responseReturn(res, 201, { message: 'Login success', token })
        } else {
          return responseReturn(res, 404, { error: "Password wrong" })
        }
      } else {
        return responseReturn(res, 404, { error: 'Email not found' })
      }
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Server error' })
    }
  }

  customer_logout = async(req,res)=>{
    res.cookie('customerToken',"",{
      expires : new Date(Date.now())
    })
    return responseReturn(res,200,{message : 'Logout success'})
  }

  // Change Password (as you had)
  changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.id;
    if (req.role && req.role !== 'customer') {
      return responseReturn(res, 403, { error: 'Unauthorized' });
    }
    if (!userId) {
      return responseReturn(res, 409, { error: 'Please Login first' });
    }

    try {
      if (!oldPassword || !newPassword) {
        return responseReturn(res, 400, { error: 'Old and new passwords required' });
      }
      if (newPassword.length < 8) {
        return responseReturn(res, 400, { error: 'New password must be at least 8 characters' });
      }

      const customer = await customerModel.findById(userId).select('+password');
      if (!customer) return responseReturn(res, 404, { error: 'Customer not found' });

      const isMatch = await bcrypt.compare(oldPassword, customer.password);
      if (!isMatch) return responseReturn(res, 400, { error: 'Invalid old password' });

      const newIsSame = await bcrypt.compare(newPassword, customer.password);
      if (newIsSame) return responseReturn(res, 400, { error: 'New password cannot be same as old password' });

      const salt = await bcrypt.genSalt(12);
      customer.password = await bcrypt.hash(newPassword, salt);
      await customer.save();

      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      return responseReturn(res, 200, { message: 'Password changed successfully! Please login again.' });
    } catch (err) {
      return responseReturn(res, 500, { error: 'Server error' });
    }
  };

  // NEW: Get my referral summary + link
  getReferral = async (req, res) => {
    try {
      const id = req.id;
      const me = await customerModel.findById(id);
      if (!me) return responseReturn(res, 404, { error: 'Customer not found' });

      const code = me.referralCode;
      const link = `${CLIENT_BASE_URL}/register?ref=${encodeURIComponent(code)}`;

      // simple stats (without pagination)
      const totalSignups = me.referralStats?.totalSignups || 0;
      const balance = me.referralBalance || 0;

      return responseReturn(res, 200, { code, link, totalSignups, balance });
    } catch (e) {
      return responseReturn(res, 500, { error: e.message });
    }
  };

  // NEW: Update my referral alias/code
  updateReferralCode = async (req, res) => {
    try {
      const id = req.id;
      const { newCode } = req.body;
      const code = (newCode || '').toLowerCase().trim();

      if (!validateAlias(code)) {
        return responseReturn(res, 400, { error: 'Invalid code. Use 3-30 chars: a-z, 0-9, -' });
      }

      const me = await customerModel.findById(id);
      if (!me) return responseReturn(res, 404, { error: 'Customer not found' });

      // rate limit (optional): allow once per 24h
      if (me.referralCodeUpdatedAt && (Date.now() - new Date(me.referralCodeUpdatedAt).getTime()) < 24 * 60 * 60 * 1000) {
        return responseReturn(res, 429, { error: 'You can change alias once per 24 hours' });
      }

      // unique check
      const exists = await customerModel
        .findOne({ referralCode: code })
        .collation({ locale: 'en', strength: 2 });
      if (exists && String(exists._id) !== String(id)) {
        return responseReturn(res, 400, { error: 'This alias is taken' });
      }

      me.referralCode = code;
      me.referralCodeUpdatedAt = new Date();
      await me.save();

      const link = `${CLIENT_BASE_URL}/register?ref=${encodeURIComponent(code)}`;
      return responseReturn(res, 200, { message: 'Referral alias updated', code, link });
    } catch (e) {
      return responseReturn(res, 500, { error: e.message });
    }
  };

  

}

module.exports = new customerAuthController()