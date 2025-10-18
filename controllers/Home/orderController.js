const moment = require('moment');
const stripe = require('stripe')(process.env.SK_TEST);

const customerOrder = require('../../models/customerOrder');
const { responseReturn } = require('../../utils/response');
const cardModel = require('../../models/cardModel');
const authorModel = require('../../models/authorModel');
const { mongo: { ObjectId } } = require('mongoose');
const myShopWallet = require('../../models/myShopWallet');
const sellerWallet = require('../../models/sellerWallet');

// NEW
const Customer = require('../../models/customerModel');
const Seller = require('../../models/sellerModel');
const { sendOrderPlacedEmails, sendOrderPaidEmails } = require('../../services/mail/orderEmails');

class orderController {

  paymentCheck = async (id) => {
    try {
      const order = await customerOrder.findById(id)
      if (order && order.payment_status === 'unpaid') {
        await customerOrder.findByIdAndUpdate(id, { delivery_status: 'cancelled' })
        await authorModel.updateMany({ orderId: id }, { delivery_status: "cancelled" })
      }
      return true
    } catch (error) {
      
    }
  }

  place_order = async (req, res) => {
    const { price, products, shipping_fee, shippingInfo, userId } = req.body
    let authorOrderData = []
    let cardId = []
    const tempDate = moment(Date.now()).format('LLL')

    let customerOrderProduct = []

    for (let i = 0; i < products.length; i++) {
      const pro = products[i].products
      for (let j = 0; j < pro.length; j++) {
        let tempCusPro = pro[j].productInfo
        tempCusPro.quantity = pro[j].quantity
        customerOrderProduct.push(tempCusPro)
        if (pro[j]._id) {
          cardId.push(pro[j]._id)
        }
      }
    }

    try {
      // 1) create main order (note: price stored = subtotal + shipping_fee)
      const order = await customerOrder.create({
        customerId: userId,
        shippingInfo,
        products: customerOrderProduct,
        price: Number(price || 0) + Number(shipping_fee || 0),
        delivery_status: 'pending',
        payment_status: 'unpaid',
        date: tempDate
      })

      // 2) author (seller) orders
      for (let i = 0; i < products.length; i++) {
        const pro = products[i].products
        const pri = products[i].price
        const sellerId = products[i].sellerId
        let storePro = []
        for (let j = 0; j < pro.length; j++) {
          let tempPro = pro[j].productInfo
          tempPro.quantity = pro[j].quantity
          storePro.push(tempPro)
        }

        authorOrderData.push({
          orderId: order.id,
          sellerId,
          products: storePro,
          price: pri,
          payment_status: 'unpaid',
          shippingInfo: 'MM Fashion World',
          delivery_status: 'pending',
          date: tempDate
        })
      }
      await authorModel.insertMany(authorOrderData)

      // 3) clear cart
      for (let k = 0; k < cardId.length; k++) {
        await cardModel.findByIdAndDelete(cardId[k])
      }

      // 4) schedule auto-cancel if unpaid
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      setTimeout(() => { this.paymentCheck(order.id) }, FOUR_HOURS)

      // 5) send emails (buyer + admin + sellers)
      try {
        const customer = await Customer.findById(userId).lean();
        const sellerIds = Array.from(new Set((products || []).map(g => g?.sellerId).filter(Boolean)));
        const sellers = sellerIds.length ? await Seller.find({ _id: { $in: sellerIds } }, { email: 1, name: 1 }).lean() : [];
        // groups = products (request-body) -> per seller items/price রয়েছে
        await sendOrderPlacedEmails({
          order,
          user: customer,
          groups: products,
          sellers,
          shippingFee: shipping_fee || 0
        });
      } catch (e) {
        console.error('order email send failed:', e.message);
      }

      return responseReturn(res, 201, { message: "order placeed success", orderId: order.id })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Order place failed' })
    }
  }

  get_customer_databorad_data = async (req, res) => {
    const { userId } = req.params
    try {
      const recentOrders = await customerOrder.find({ customerId: new ObjectId(userId) }).limit(5)
      const pendingOrder = await customerOrder.find({ customerId: new ObjectId(userId), delivery_status: 'pending' }).countDocuments()
      const totalOrder = await customerOrder.find({ customerId: new ObjectId(userId) }).countDocuments()
      const cancelledOrder = await customerOrder.find({ customerId: new ObjectId(userId), delivery_status: 'cancelled' }).countDocuments()
      return responseReturn(res, 200, { recentOrders, pendingOrder, cancelledOrder, totalOrder })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Dashboard load failed' })
    }
  }

  get_orders = async (req, res) => {
    const { customerId, status } = req.params
    try {
      let orders = []
      if (status !== 'all') {
        orders = await customerOrder.find({ customerId: new ObjectId(customerId), delivery_status: status })
      } else {
        orders = await customerOrder.find({ customerId: new ObjectId(customerId) })
      }
      return responseReturn(res, 200, { orders })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Orders fetch failed' })
    }
  }

  get_order = async (req, res) => {
    const { orderId } = req.params
    try {
      const order = await customerOrder.findById(orderId)
      return responseReturn(res, 200, { order })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Order fetch failed' })
    }
  }

  get_admin_orders = async (req, res) => {
    let { page = 1, perPage = 10 } = req.query;
    page = parseInt(page); perPage = parseInt(perPage);
    const skipPage = perPage * (page - 1);
    try {
      const orders = await customerOrder.aggregate([
        {
          $lookup: {
            from: 'authororders',
            localField: "_id",
            foreignField: 'orderId',
            as: 'suborder'
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skipPage },
        { $limit: perPage }
      ]);
      const totalOrderAgg = await customerOrder.aggregate([
        {
          $lookup: {
            from: 'authororders',
            localField: "_id",
            foreignField: 'orderId',
            as: 'suborder'
          }
        },
        { $count: 'count' }
      ]);
      const totalOrder = totalOrderAgg?.[0]?.count || 0;
      return responseReturn(res, 200, { orders, totalOrder });
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  }

  get_seller_orders = async (req, res) => {
    const { sellerId } = req.params
    let { page, perPage } = req.query
    page = parseInt(page); perPage = parseInt(perPage)
    const skipPage = perPage * (page - 1)
    try {
      const orders = await authorModel.find({ sellerId }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })
      const totalOrder = await authorModel.find({ sellerId }).countDocuments()
      return responseReturn(res, 200, { orders, totalOrder })
    } catch (error) {
      return responseReturn(res, 500, { message: 'internal server error' })
    }
  }

  get_admin_order = async (req, res) => {
    const { orderId } = req.params;
    try {
      if (!ObjectId.isValid(orderId)) {
        return responseReturn(res, 400, { error: 'Invalid order id' });
      }
      const orderArr = await customerOrder.aggregate([
        { $match: { _id: new ObjectId(orderId) } },
        {
          $lookup: {
            from: 'authororders',
            localField: '_id',
            foreignField: 'orderId',
            as: 'suborder'
          }
        }
      ]);
      const order = orderArr[0];
      if (!order) return responseReturn(res, 404, { error: 'Order not found' });
      return responseReturn(res, 200, { order });
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  };

  get_seller_order = async (req, res) => {
    const { orderId } = req.params
    try {
      const order = await authorModel.findById(orderId)
      return responseReturn(res, 200, { order })
    } catch (error) {
      return responseReturn(res, 500, { error: 'Fetch failed' })
    }
  }

  admin_order_status_update = async (req, res) => {
    const { orderId } = req.params
    const { status } = req.body
    try {
      await customerOrder.findByIdAndUpdate(orderId, { delivery_status: status })
      return responseReturn(res, 200, { message: 'order status change success' })
    } catch (error) {
      return responseReturn(res, 500, { message: 'internal server error' })
    }
  }

  seller_order_status_update = async (req, res) => {
    const { orderId } = req.params
    const { status } = req.body
    try {
      await authorModel.findByIdAndUpdate(orderId, { delivery_status: status })
      return responseReturn(res, 200, { message: 'order status change success' })
    } catch (error) {
      return responseReturn(res, 500, { message: 'internal server error' })
    }
  }

  create_payment = async (req, res) => {
    try {
      const { price } = req.body;
      const amount = Math.round(Number(price) * 100);
      if (!amount || amount <= 0) {
        return responseReturn(res, 400, { error: 'Invalid amount' });
      }
      const payment = await stripe.paymentIntents.create({
        amount,
        currency: 'bdt',
        automatic_payment_methods: { enabled: true }
      });
      return responseReturn(res, 200, { clientSecret: payment.client_secret });
    } catch (error) {
     ;
      return responseReturn(res, 500, { error: error.message });
    }
  };

  order_confirm = async (req, res) => {
    const { orderId } = req.params
    try {
      await customerOrder.findByIdAndUpdate(orderId, { payment_status: 'paid', delivery_status: 'pending' })
      await authorModel.updateMany({ orderId: new ObjectId(orderId) }, { payment_status: 'paid', delivery_status: 'pending' })

      const cuOrder = await customerOrder.findById(orderId)
      const auOrder = await authorModel.find({ orderId: new ObjectId(orderId) })

      const time = moment(Date.now()).format('l')
      const splitTime = time.split('/')

      await myShopWallet.create({ amount: cuOrder.price, month: splitTime[0], year: splitTime[2] })
      for (let i = 0; i < auOrder.length; i++) {
        await sellerWallet.create({
          sellerId: auOrder[i].sellerId.toString(),
          amount: auOrder[i].price,
          month: splitTime[0],
          year: splitTime[2],
        })
      }

      // NEW: send payment confirmation emails
      try {
        const customer = await Customer.findById(cuOrder.customerId).lean();
        const sellerIds = auOrder.map(a => a.sellerId).filter(Boolean);
        const sellers = sellerIds.length ? await Seller.find({ _id: { $in: sellerIds } }, { email: 1, name: 1 }).lean() : [];
        await sendOrderPaidEmails({
          order: cuOrder,
          user: customer,
          authorOrders: auOrder,
          sellers
        });
      } catch (e) {
        console.error('payment email send failed:', e.message);
      }

      return responseReturn(res, 200, { message: 'success' })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Confirm failed' })
    }
  }
}

module.exports = new orderController()