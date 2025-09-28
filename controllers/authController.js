const adminModel = require("../models/adminModel");
const bcrypt = require('bcrypt')
const createToken = require('../utils/tokenCreate');
const { responseReturn } = require('../utils/response');

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

    // get user
    getUser = async(req, res) =>{
        const{id, role} = req;
        console.log(id, role);
       try {
         if(role === 'admin'){
            const user = await adminModel.findById(id)
            return responseReturn(res, 200, { userInfo:user});
        }else{
            console.log("seller info");
            
        }

       } catch (error) {
        console.log(error.message);
       }
        
    }
}

module.exports = new authController();