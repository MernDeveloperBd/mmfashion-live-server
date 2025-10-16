const sellerModel = require("../../models/sellerModel");
const { responseReturn } = require("../../utils/response");

class sellerController {
    get_seller_request = async (req, res) => {
        const { page, searchValue, perPage } = req.query;
        const skipPage = parseInt(perPage) * (parseInt(page) - 1);
        try {
            if (searchValue) {

            } else {
                const sellers = await sellerModel.find({ status: 'pending' }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })
                const totalSeller = await sellerModel.find({ status: 'pending' }).countDocuments()
                responseReturn(res, 200, { totalSeller, sellers })
            }
        } catch (error) {
             responseReturn(res, 500, { error: error.message })
        }
    }

    // get seller
    get_seller = async (req, res) => {
        const{sellerId} = req.params;
        try {
            const seller = await sellerModel.findById(sellerId)
             responseReturn(res, 200, { seller })
        } catch (error) {
            responseReturn(res, 500, { error: error.message })
        }
        
    }

    //update seller status
    seller_status_update = async(req, res) =>{   
        
        try {
            await sellerModel.findByIdAndUpdate(sellerId,{
                status
            })
            const seller = await sellerModel.findById(sellerId)
             responseReturn(res, 200, { seller, message:"Seller status update" })
        } catch (error) {
             responseReturn(res, 500, { error: error.message })
        }
        
    }
// get active sellers
     get_active_sellers = async (req, res) => {
        let { page, searchValue, perPage } = req.query
        page = parseInt(page)
        perPage = parseInt(perPage)

        const skipPage = perPage * (page - 1)

        try {
            if (searchValue) {
                const sellers = await sellerModel.find({
                    $text: { $search: searchValue },
                    status: 'active'
                }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })

                const totalSeller = await sellerModel.find({
                    $text: { $search: searchValue },
                    status: 'active'
                }).countDocuments()

                responseReturn(res, 200, { totalSeller, sellers })
            } else {
                const sellers = await sellerModel.find({ status: 'active' }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })
                const totalSeller = await sellerModel.find({ status: 'active' }).countDocuments()
                responseReturn(res, 200, { totalSeller, sellers })
            }

        } catch (error) {
            console.log('active seller get ' + error.message)
        }
    }

    // deactive sellers
     get_deactive_sellers = async (req, res) => {
        let { page, searchValue, perPage } = req.query
        page = parseInt(page)
        perPage = parseInt(perPage)

        const skipPage = perPage * (page - 1)

        try {
            if (searchValue) {
                const sellers = await sellerModel.find({
                    $text: { $search: searchValue },
                    status: 'deactive'
                }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })

                const totalSeller = await sellerModel.find({
                    $text: { $search: searchValue },
                    status: 'deactive'
                }).countDocuments()

                responseReturn(res, 200, { totalSeller, sellers })
            } else {
                const sellers = await sellerModel.find({ status: 'deactive' }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })
                const totalSeller = await sellerModel.find({ status: 'deactive' }).countDocuments()
                responseReturn(res, 200, { totalSeller, sellers })
            }

        } catch (error) {
            console.log('active seller get ' + error.message)
        }
    }


}
module.exports = new sellerController()