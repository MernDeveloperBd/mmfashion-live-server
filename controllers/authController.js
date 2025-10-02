const formidable = require("formidable");
const formidableLib = require('formidable');
const cloudinary = require("cloudinary").v2;
const fs = require('fs');
const adminModel = require("../models/adminModel");
const bcrypt = require('bcrypt')
const createToken = require('../utils/tokenCreate');
const { responseReturn } = require('../utils/response');
const sellerModel = require("../models/sellerModel");
const sellerCustomerModel = require("../models/chat/sellerCustomerModel");
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
                console.log(seller);
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

            // ✅ টোকেন তৈরি
            const token = await createToken({
                id: seller.id,
                role: seller.role
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
                user: { name: seller.name, email: seller.email }
            });

        } catch (error) {
            return responseReturn(res, 500, { error: error.message });
        }
    }
    // get user
    getUser = async (req, res) => {
        const { id, role } = req;
        console.log(id, role);
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
                console.error('Unsupported formidable export:', formidableLib);
                return responseReturn(res, 500, { error: 'Unsupported formidable version' });
            }
            form.parse(req, async (err, fields, files) => {
                if (err) {
                    console.error('form.parse error:', err);
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
                    console.error('uploadErr:', uploadErr);
                    return responseReturn(res, 500, { error: 'Image upload failed', detail: uploadErr.message });
                }
            });
        } catch (e) {
            console.error('profile_image_upload unexpected error:', e);
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


}

module.exports = new authController();