const { v4: uuidv4 } = require('uuid');
const stripeModel = require('../../models/stripeModel');
const { responseReturn } = require('../../utils/response');
const sellerModel = require('../../models/sellerModel');
const sellerWallet = require('../../models/sellerWallet');
const myShopWallet = require('../../models/myShopWallet');
const withdrowRequest = require('../../models/withdrowRequest');
const bkashPayment = require('../../models/bkashPayment');
const customerOrder = require('../../models/customerOrder');
const AuthorOrderModel = require('../../models/authorModel');
const stripe = require('stripe')(process.env.SK_TEST);
// const { v4: uuidv4 } = require('uuid')
// const stripe = require('stripe')(process.env.stripe_key)


class paymentController {
    create_stripe_connect_account = async (req, res) => {
        const { id } = req
        const uid = uuidv4()

        try {
            const stripInfo = await stripeModel.findOne({ sellerId: id })
            if (stripInfo) {
                await stripeModel.deleteOne({ sellerId: id })
                const account = await stripe.accounts.create({ type: 'express' })

                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: `${process.env.CLIENT_URL}/refresh`,
                    return_url: `${process.env.CLIENT_URL}/success?activeCode=${uid}`,
                    type: 'account_onboarding'
                })
                await stripeModel.create({
                    sellerId: id,
                    stripeId: account.id,
                    code: uid
                })
                responseReturn(res, 201, { url: accountLink.url })
            } else {

                const account = await stripe.accounts.create({ type: 'express' })

                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: `${process.env.CLIENT_URL}/refresh`,
                    return_url: `${process.env.CLIENT_URL}/success?activeCode=${uid}`,
                    type: 'account_onboarding'
                })
                await stripeModel.create({
                    sellerId: id,
                    stripeId: account.id,
                    code: uid
                })
                responseReturn(res, 201, { url: accountLink.url })
            }
        } catch (error) {
            console.log('stripe connect account create error ' + error.message)
        }
    }

    active_stripe_connect_account = async (req, res) => {
        const { activeCode } = req.params
        const { id } = req
        try {
            const userStripeInfo = await stripeModel.findOne({ code: activeCode })
            if (userStripeInfo) {
                await sellerModel.findByIdAndUpdate(id, {
                    payment: 'active'
                })
                responseReturn(res, 200, { message: 'payment active' })
            } else {
                responseReturn(res, 404, { message: 'payment active failed' })
            }



        } catch (error) {

        }

    }

    sunAmount = (data) => {
        let sum = 0;

        for (let i = 0; i < data.length; i++) {
            sum = sum + data[i].amount
        }
        return sum
    }


    get_seller_payemt_details = async (req, res) => {
        const { sellerId } = req.params;
        try {
            // যদি sellerWallet.sellerId টাইপ ObjectId হয়:
            // const amountAgg = await sellerWallet.aggregate([
            //   { $match: { sellerId: new ObjectId(sellerId) } },
            //   { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
            // ]);

            // যদি String হয় (আপনার কোডে তাই ধরে):
            const amountAgg = await sellerWallet.aggregate([
                { $match: { sellerId: sellerId } },
                { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
            ]);

            const pendingWithdrows = await withdrowRequest.find({ sellerId, status: 'pending' });
            const successWithdrows = await withdrowRequest.find({ sellerId, status: 'success' });

            const sum = (arr) => arr.reduce((s, it) => s + (it?.amount || 0), 0);

            const pendingAmount = sum(pendingWithdrows);
            const withdrowAmount = sum(successWithdrows);
            const totalAmount = amountAgg?.[0]?.totalAmount || 0;

            let availableAmount = 0;
            if (totalAmount > 0) {
                availableAmount = totalAmount - (pendingAmount + withdrowAmount);
            }

            return responseReturn(res, 200, {
                totalAmount,
                pendingAmount,
                withdrowAmount,
                availableAmount,
                successWithdrows,
                pendingWithdrows
            });
        } catch (error) {
            return responseReturn(res, 500, { error: error.message });
        }
    }

    withdrowal_request = async (req, res) => {
        const { amount, sellerId } = req.body

        try {
            const withdrowal = await withdrowRequest.create({
                sellerId,
                amount: parseInt(amount)
            })
            responseReturn(res, 200, { withdrowal, message: 'withdrowal request send' })
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal server error' })
        }
    }
    get_payment_request = async (req, res) => {

        try {
            const withdrowalRequest = await withdrowRequest.find({ status: 'pending' })
            responseReturn(res, 200, { withdrowalRequest })
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal server error' })
        }
    }

    
payment_request_confirm = async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return responseReturn(res, 400, { error: 'paymentId is required' });

    const reqDoc = await withdrowRequest.findById(paymentId);
    if (!reqDoc) return responseReturn(res, 404, { error: 'Request not found' });
    if (reqDoc.status !== 'pending') return responseReturn(res, 400, { error: 'Request already processed' });

    // ObjectId ছাড়াই string দিয়ে খুঁজুন
    const stripeInfo = await stripeModel.findOne({ sellerId: reqDoc.sellerId });
    if (!stripeInfo || !stripeInfo.stripeId) {
      return responseReturn(res, 400, { error: 'Seller payout account is not active' });
    }

    const amount = Math.round(Number(reqDoc.amount) * 100);
    if (!amount || amount <= 0) return responseReturn(res, 400, { error: 'Invalid amount' });

    await withdrowRequest.findByIdAndUpdate(paymentId, { status: 'success' });
    return responseReturn(res, 200, { payment: { _id: reqDoc._id }, message: 'request confirm success' });
  } catch (error) {
    return responseReturn(res, 500, { message: 'Internal server error', error: error.message });
  }
};
// bkash payemtn
get_bkash_config = async (req, res) => {
  try {
    const merchantNumber = process.env.BKASH_MERCHANT || '01979123009'; // .env থাকলে ওখান থেকে
    return responseReturn(res, 200, { merchantNumber });
  } catch (err) {
    return responseReturn(res, 500, { message: 'Internal server error' });
  }
}

submit_bkash_payment = async (req, res) => {
  try {
    const { orderId, amount, senderNumber, trxId } = req.body;
    const userId = req.id;

    if (!orderId || !amount || !senderNumber || !trxId) {
      return responseReturn(res, 400, { message: 'Missing required fields' });
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return responseReturn(res, 400, { message: 'Invalid amount' });
    }

    // চাইলে একই trxId ডুপ্লিকেট বন্ধ করা যায়
    // const exists = await bkashPayment.findOne({ trxId });
    // if (exists) return responseReturn(res, 400, { message: 'Duplicate trxId' });

    const doc = await bkashPayment.create({
      userId,
      orderId,
      amount: amt,
      senderNumber,
      trxId,
      status: 'pending',
    });

    return responseReturn(res, 201, {
      message: 'Bkash payment submitted. We will verify shortly.',
      payment: { _id: doc._id, status: doc.status }
    });
  } catch (err) {
    return responseReturn(res, 500, { message: 'Internal server error' });
  }
}

// 1) এই অর্ডারের সব bkash submissions ফেরত দেবে (latest first)
get_bkash_by_order = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payments = await bkashPayment.find({ orderId }).sort({ createdAt: -1 });
    return responseReturn(res, 200, { payments });
  } catch (e) {
    return responseReturn(res, 500, { message: 'Internal server error' });
  }
}

// 2) Approve করলে bkashPayment + Order আপডেট
approve_bkash_payment = async (req, res) => {
  try {
    const { paymentId, note } = req.body;
    if (!paymentId) return responseReturn(res, 400, { message: 'paymentId required' });

    const doc = await bkashPayment.findById(paymentId);
    if (!doc) return responseReturn(res, 404, { message: 'Payment not found' });
    if (doc.status !== 'pending') return responseReturn(res, 400, { message: 'Already processed' });

    // একই trxId আগেই approve করা হয়েছে কিনা চেক
    const duplicate = await bkashPayment.findOne({
      trxId: doc.trxId, status: 'approved', _id: { $ne: doc._id }
    });
    if (duplicate) return responseReturn(res, 400, { message: 'Duplicate trxId already approved' });

    await bkashPayment.findByIdAndUpdate(paymentId, {
      status: 'approved',
      verifiedAt: new Date(),
      verifiedBy: req.id,
      note: note || ''
    });

    // Order কে paid করুন (আপনার orderModel-এ ফিল্ড না থাকলে কমেন্ট রাখুন)
  await customerOrder.findByIdAndUpdate(doc.orderId, {
payment_status: 'paid',
payment_method: 'bkash',
transaction_id: doc.trxId
});
 await AuthorOrderModel.updateMany( // নিশ্চিত করুন যে AuthorOrderModel ইমপোর্ট করা আছে
      { orderId: doc.orderId },
      { payment_status: 'paid' }
    );

    return responseReturn(res, 200, { message: 'Bkash payment approved', paymentId });
  } catch (e) {
    return responseReturn(res, 500, { message: 'Internal server error' });
  }
}

// 3) Reject করলে শুধু bkashPayment আপডেট, order অপরিবর্তিত
reject_bkash_payment = async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    if (!paymentId) return responseReturn(res, 400, { message: 'paymentId required' });

    const doc = await bkashPayment.findById(paymentId);
    if (!doc) return responseReturn(res, 404, { message: 'Payment not found' });
    if (doc.status !== 'pending') return responseReturn(res, 400, { message: 'Already processed' });

    await bkashPayment.findByIdAndUpdate(paymentId, {
      status: 'rejected',
      verifiedAt: new Date(),
      verifiedBy: req.id,
      rejectReason: reason || ''
    });

    return responseReturn(res, 200, { message: 'Bkash payment rejected', paymentId });
  } catch (e) {
    return responseReturn(res, 500, { message: 'Internal server error' });
  }
}



}

module.exports = new paymentController()