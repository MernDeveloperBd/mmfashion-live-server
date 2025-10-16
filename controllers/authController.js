// const formidable = require("formidable");
const formidableLib = require('formidable');
const cloudinary = require("cloudinary").v2;
const fs = require('fs');
const adminModel = require("../models/adminModel");
const bcrypt = require('bcrypt')
const createToken = require('../utils/tokenCreate');
const { responseReturn } = require('../utils/response');
const sellerModel = require("../models/sellerModel");
const sellerCustomerModel = require("../models/chat/sellerCustomerModel");
const customerModel = require("../models/customerModel");
const referralEventModel = require('../models/referralEventModel');

const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:5173';


class authController {
    admin_login = async (req, res) => {
        const { email, password } = req.body;
        try {
            const admin = await adminModel.findOne({ email }).select('+password');
            if (!admin) {
                return responseReturn(res, 400, { error: "Email not found" });
            }

            const match = await bcrypt.compare(password, admin.password);
            if (!match) {
                return responseReturn(res, 400, { error: "Password is incorrect" });
            }

            // ✅ টোকেন তৈরি
            const token = await createToken({
                id: admin.id,
                role: admin.role
            });

            // ✅ কুকি সেট (সঠিক expires সহ)
            res.cookie('accessToken', token, {
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: process.env.SECRET === 'production',
                sameSite: 'strict'
            });

            // ✅ সফল লগইন রেসপন্স
            return responseReturn(res, 200, {
                message: "Login successful", token: token,
                user: { name: admin.name, email: admin.email }
            });

        } catch (error) {
            return responseReturn(res, 500, { error: error.message });
        }
    }
    // Seller Register
    seller_register = async (req, res) => {
        const { email, name, password } = req.body;
        try {
            const getUser = await sellerModel.findOne({ email })

            if (getUser) {
                responseReturn(res, 404, { error: 'Email already exists' })
            } else {
                const seller = await sellerModel.create({
                    name,
                    email,
                    password: await bcrypt.hash(password, 10),
                    method: 'manualy',
                    shopInfo: {}
                })
                await sellerCustomerModel.create({
                    myId: seller.id
                })
                const token = await createToken({ id: seller.id, role: seller.role })
                res.cookie('accessToken', token, {
                    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                })
                responseReturn(res, 201, { token, message: 'Register success' })

            }
        } catch (error) {
            responseReturn(res, 500, { error: 'Internal server error' })

        }
    }

    // seller login
    seller_login = async (req, res) => {
        const { email, password } = req.body;
        try {
            const seller = await sellerModel.findOne({ email }).select('+password');
            if (!seller) {
                return responseReturn(res, 400, { error: "Email not found" });
            }

            const match = await bcrypt.compare(password, seller.password);
            if (!match) {
                return responseReturn(res, 400, { error: "Password is incorrect" });
            }
            
            const token = await createToken({
                id: seller.id,
                role: seller.role
            });
           
            res.cookie('accessToken', token, {
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: process.env.SECRET === 'production',
                sameSite: 'strict'
            });
          
            return responseReturn(res, 200, {
                message: "Login successful", token: token,
                user: { name: seller.name, email: seller.email }
            });

        } catch (error) {
            return responseReturn(res, 500, { error: error.message });
        }
    }

    
    // get user
    getUser = async (req, res) => {
        const { id, role } = req;
        try {
            if (role === 'admin') {
                const user = await adminModel.findById(id)
                return responseReturn(res, 200, { userInfo: user });
            } else {
                const seller = await sellerModel.findById(id)
                return responseReturn(res, 200, { userInfo: seller });
            }

        } catch (error) {
            responseReturn(res, 500, { error: 'Internal server error' })
        }

    }

    // Get users
    get_users = async (req, res) => {
    let { page = 1, perPage = 10, searchValue = '' } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);
    const skipPage = perPage * (page - 1);

    try {
      const regex = searchValue ? new RegExp(searchValue, 'i') : null;
      const query = regex ? { $or: [{ name: regex }, { email: regex }] } : {};

      const users = await customerModel
        .find(query)
        .select('-password') // পাসওয়ার্ড পাঠাবেন না
        .skip(skipPage)
        .limit(perPage)
        .sort({ createdAt: -1 });

      const totalUser = await customerModel.countDocuments(query);

      return responseReturn(res, 200, { users, totalUser });
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  }

    //profile picture upload
    profile_image_upload = async (req, res) => {
        try {
            const opts = { multiples: false, keepExtensions: true };
            let form;
            if (typeof formidableLib === 'function') {
                form = formidableLib(opts);
            } else if (formidableLib && typeof formidableLib.IncomingForm === 'function') {
                form = new formidableLib.IncomingForm(opts);
            } else if (formidableLib && typeof formidableLib.Formidable === 'function') {
                form = new formidableLib.Formidable(opts);
            } else {
                return responseReturn(res, 500, { error: 'Unsupported formidable version' });
            }
            form.parse(req, async (err, fields, files) => {
                if (err) {
                    return responseReturn(res, 500, { error: 'Form parse error', detail: err.message });
                }

                try {
                    let imageField = files.image || files.file || files.avatar;
                    if (!imageField) {
                        return responseReturn(res, 400, { error: 'No file uploaded' });
                    }

                    const fileObj = Array.isArray(imageField) ? imageField[0] : imageField;
                    const filePath = fileObj.filepath || fileObj.path;
                    if (!filePath) {
                        return responseReturn(res, 500, { error: 'Uploaded file path not found' });
                    }
                    const result = await cloudinary.uploader.upload(filePath, { folder: 'profile' });
                    fs.unlink(filePath, (e) => { if (e) console.warn('temp file rm error', e); });
                    const sellerId = req.user?.id || req.user?._id || req.sellerId || req.id || null;
                    if (sellerId) {
                        await sellerModel.findByIdAndUpdate(sellerId, { image: result.secure_url || result.url });
                    }

                    return responseReturn(res, 200, { message: 'Image uploaded', image: result.secure_url || result.url });
                } catch (uploadErr) {
                    return responseReturn(res, 500, { error: 'Image upload failed', detail: uploadErr.message });
                }
            });
        } catch (e) {
            return responseReturn(res, 500, { error: 'Server error', detail: e.message });
        }
    }

    //profile info update
    profile_info_add = async (req, res) => {
        const { shopName, businessPage, whatsapp, division, district, subDistrict } = req.body;
        const { id } = req;
        try {
            await sellerModel.findByIdAndUpdate(id, {
                shopInfo: {
                    shopName, businessPage, whatsapp, division, district, subDistrict
                }
            })
            const userInfo = await sellerModel.findById(id)
            return responseReturn(res, 201, { message: "profile information add success", userInfo });
        } catch (error) {
            responseReturn(res, 500, { error: error.message })
        }
    }

      logout = async (req, res) => {
        try {
            res.cookie('accessToken',null,{
                expires : new Date(Date.now()),
                httpOnly : true
            })
            responseReturn(res,200,{message : 'logout success'})
        } catch (error) {
            responseReturn(res, 500, { error: error.message })
        }
    }

     change_password = async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.id;
      const role = req.role;

      if (!userId) {
        return responseReturn(res, 409, { error: 'Please Login first' });
      }
      if (!oldPassword || !newPassword) {
        return responseReturn(res, 400, { error: 'Old and new passwords required' });
      }
      if (newPassword.length < 8) {
        return responseReturn(res, 400, { error: 'New password must be at least 8 characters' });
      }
      // Optional: আরও স্ট্রং চেক
      // if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      //   return responseReturn(res, 400, { error: 'Password must contain uppercase, lowercase & number' });
      // }

      // role অনুযায়ী model সিলেক্ট
      const Model = role === 'admin' ? adminModel : sellerModel;

      const user = await Model.findById(userId).select('+password');
      if (!user) {
        return responseReturn(res, 404, { error: 'User not found' });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return responseReturn(res, 400, { error: 'Invalid old password' });
      }

      const sameAsOld = await bcrypt.compare(newPassword, user.password);
      if (sameAsOld) {
        return responseReturn(res, 400, { error: 'New password cannot be same as old password' });
      }

      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      // Force logout: cookie clear
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return responseReturn(res, 200, { message: 'Password changed successfully! Please login again.' });
    } catch (err) {
      return responseReturn(res, 500, { error: 'Server error' });
    }
  };

   profile_basic_update = async (req, res) => {
    try {
      const { name, email } = req.body;
      const { id, role } = req;
      const Model = role === 'admin' ? adminModel : sellerModel;

      const updates = {};
      if (name) updates.name = name.trim();
      if (email) {
        const exists = await Model.findOne({ email: email.trim(), _id: { $ne: id } });
        if (exists) return responseReturn(res, 400, { error: 'Email already in use' });
        updates.email = email.trim();
      }

      if (!Object.keys(updates).length) {
        return responseReturn(res, 400, { error: 'Nothing to update' });
      }

      const user = await Model.findByIdAndUpdate(id, updates, { new: true });
      if (!user) return responseReturn(res, 404, { error: 'User not found' });

      return responseReturn(res, 200, { message: 'Profile updated', userInfo: user });
    } catch (e) {
      return responseReturn(res, 500, { error: e.message });
    }
  };
  
  get_user_referrals = async (req, res) => {
  try {
    // Optional: admin guard (আপনার authMiddleware যদি req.role সেট করে)
    // if (req.role !== 'admin') return responseReturn(res, 403, { error: 'Forbidden' });

    const { userId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.max(1, Math.min(100, parseInt(req.query.perPage) || 10));

    const customer = await customerModel.findById(userId)
      .select('name email referralCode referralStats referralBalance referralPending referredBy createdAt');
    if (!customer) {
      return responseReturn(res, 404, { error: 'Customer not found' });
    }

    const link = `${CLIENT_BASE_URL}/register?ref=${encodeURIComponent(customer.referralCode || '')}`;

    const total = await referralEventModel.countDocuments({ referrerId: userId });

    const eventsDocs = await referralEventModel.find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('referredUserId', 'name email referralCode createdAt');

    let referredBy = null;
    if (customer.referredBy) {
      const rb = await customerModel.findById(customer.referredBy).select('name email referralCode');
      if (rb) referredBy = { _id: rb._id, name: rb.name, email: rb.email, referralCode: rb.referralCode };
    }

    const events = eventsDocs.map(ev => ({
      id: ev._id,
      referredUser: ev.referredUserId ? {
        _id: ev.referredUserId._id,
        name: ev.referredUserId.name,
        email: ev.referredUserId.email,
        referralCode: ev.referredUserId.referralCode || null,
        joinedAt: ev.referredUserId.createdAt
      } : null,
      referredAt: ev.createdAt
    }));

    return responseReturn(res, 200, {
      summary: {
        code: customer.referralCode || null,
        link,
        totalSignups: customer.referralStats?.totalSignups || 0,
        balance: customer.referralBalance || 0,
        pending: customer.referralPending || 0,
        referredBy
      },
      events: { data: events, total, page, perPage }
    });
  } catch (e) {
    return responseReturn(res, 500, { error: 'Server error' });
  }
};
 



}

module.exports = new authController();