const authorOrder = require('../../models/authorModel')
const customerOrder = require('../../models/customerOrder')
const sellerWallet = require('../../models/sellerWallet')
const myShopWallet = require('../../models/myShopWallet')
const sellerModel = require('../../models/sellerModel')

const adminSellerMessage = require('../../models/chat/adminSellerMessage')
const sellerCustomerMessage = require('../../models/chat/sellerCustomerMessage')
const productModel = require('../../models/productModel') 

const { mongo: { ObjectId } } = require('mongoose')
const { responseReturn } = require('../../utils/response');


 module.exports.get_seller_dashboard_data = async (req, res) => {
    const { id } = req;

    try {
        const totalSele = await sellerWallet.aggregate([
            {
                $match: {
                    sellerId: {
                        $eq: id
                    }
                }
            }, {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ])

        const totalProduct = await productModel.find({
            sellerId: new ObjectId(id)
        }).countDocuments()

        const totalOrder = await authorOrder.find({
            sellerId: new ObjectId(id)
        }).countDocuments()

        const totalPendingOrder = await authorOrder.find({
            $and: [
                {
                    sellerId: {
                        $eq: new ObjectId(id)
                    }
                },
                {
                    delivery_status: {
                        $eq: 'pending'
                    }
                }
            ]
        }).countDocuments()

        const messages = await sellerCustomerMessage.find({
            $or: [
                {
                    senderId: {
                        $eq: id
                    }
                },
                {
                    receverId: {
                        $eq: id
                    }
                }
            ]
        }).limit(3)

        const recentOrders = await authorOrder.find({
            sellerId: new ObjectId(id)
        }).limit(5)

        responseReturn(res, 200, {
            totalOrder,
            totalSale: totalSele.length > 0 ? totalSele[0].totalAmount : 0,
            totalPendingOrder,
            messages,
            recentOrders,
            totalProduct
        })
    } catch (error) {
        console.log('get seller dashboard data error ' + error.messages)
    }
} 



module.exports.get_admin_dashboard_data = async (req, res) => {
  try {
    // Total sales from PAID orders (stripe + bkash)
    const saleAgg = await customerOrder.aggregate([
      { $match: { payment_status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    const totalSale = saleAgg?.[0]?.total || 0;

    const totalProduct = await productModel.countDocuments({});
    const totalOrder = await customerOrder.countDocuments({});
    const totalSeller = await sellerModel.countDocuments({});
    const messages = await adminSellerMessage.find({}).sort({ createdAt: -1 }).limit(3);

    const recentOrders = await customerOrder.find(
      {},
      { _id: 1, price: 1, payment_status: 1, delivery_status: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).limit(10).lean();

    return responseReturn(res, 200, {
      totalOrder,
      totalSale,
      totalSeller,
      messages,
      recentOrders,
      totalProduct
    });
  } catch (error) {
    console.log('get admin dashboard data error ' + error.message);
    return responseReturn(res, 500, { message: 'Internal server error' });
  }
};

