const adminSellerMessage = require("../../models/chat/adminSellerMessage");
const sellerCustomerMessage = require("../../models/chat/sellerCustomerMessage");
const sellerCustomerModel = require("../../models/chat/sellerCustomerModel");
const customerModel = require("../../models/customerModel");
const sellerModel = require("../../models/sellerModel");
const { responseReturn } = require('../../utils/response');

class chatController {
  // customer <-> seller friends + messages
 // controllers/Chat/ChatController.js

add_customer_friend = async (req, res) => {
  const { sellerId, userId } = req.body;
  try {
    if (!sellerId) {
      const MyFriends = await sellerCustomerModel.findOne({ myId: userId });
      return responseReturn(res, 200, {
        myFriends: MyFriends?.myFriends || []
      });
    }

    const seller = await sellerModel.findById(sellerId);
    const user = await customerModel.findById(userId);
    if (!seller || !user) {
      return responseReturn(res, 404, { error: 'Seller or customer not found' });
    }

    // add seller to customer's list (userId -> sees seller)
    const checkSeller = await sellerCustomerModel.findOne({
      myId: userId,
      myFriends: { $elemMatch: { fdId: sellerId } }
    });

    const sellerFriendPayload = {
      fdId: sellerId,
      name: seller.shopInfo?.shopName || seller.name || 'Seller',
      image: seller?.image || seller?.shopInfo?.logo || '' // FIX: seller image
    };

    if (!checkSeller) {
      await sellerCustomerModel.updateOne(
        { myId: userId },
        { $push: { myFriends: sellerFriendPayload } },
        { upsert: true }
      );
    } else {
      // already exists, ensure image/name up-to-date
      await sellerCustomerModel.updateOne(
        { myId: userId, "myFriends.fdId": sellerId },
        {
          $set: {
            "myFriends.$.name": sellerFriendPayload.name,
            ...(sellerFriendPayload.image ? { "myFriends.$.image": sellerFriendPayload.image } : {})
          }
        }
      );
    }

    // add customer to seller's list (sellerId -> sees customer)
    const checkCustomer = await sellerCustomerModel.findOne({
      myId: sellerId,
      myFriends: { $elemMatch: { fdId: userId } }
    });

    const customerFriendPayload = {
      fdId: userId,
      name: user.name,
      image: user?.image || user?.avatar || '' // FIX: customer image
    };

    if (!checkCustomer) {
      await sellerCustomerModel.updateOne(
        { myId: sellerId },
        { $push: { myFriends: customerFriendPayload } },
        { upsert: true }
      );
    } else {
      await sellerCustomerModel.updateOne(
        { myId: sellerId, "myFriends.fdId": userId },
        {
          $set: {
            "myFriends.$.name": customerFriendPayload.name,
            ...(customerFriendPayload.image ? { "myFriends.$.image": customerFriendPayload.image } : {})
          }
        }
      );
    }

    // messages
    const messages = await sellerCustomerMessage.find({
      $or: [
        { $and: [{ receverId: { $eq: sellerId } }, { senderId: { $eq: userId } }] },
        { $and: [{ receverId: { $eq: userId } }, { senderId: { $eq: sellerId } }] }
      ]
    }).sort({ createdAt: 1 });

    const MyFriends = await sellerCustomerModel.findOne({ myId: userId });
    const currentFd = MyFriends?.myFriends?.find(s => s.fdId === sellerId) || null;

    return responseReturn(res, 200, {
      myFriends: MyFriends?.myFriends || [],
      currentFd,
      messages
    });

  } catch (error) {
    ;
    return responseReturn(res, 500, { error: 'Server error' });
  }
}

  customer_message_add = async (req, res) => {
    const { userId, text, sellerId, name } = req.body;
    try {
      const message = await sellerCustomerMessage.create({
        senderId: userId,
        senderName: name,
        receverId: sellerId,
        message: text
      });

      // reorder for customer
      const data = await sellerCustomerModel.findOne({ myId: userId });
      let myFriends = data?.myFriends || [];
      let index = myFriends.findIndex(f => f.fdId === sellerId);
      while (index > 0) {
        let temp = myFriends[index];
        myFriends[index] = myFriends[index - 1];
        myFriends[index - 1] = temp;
        index--;
      }
      await sellerCustomerModel.updateOne({ myId: userId }, { myFriends });

      // reorder for seller
      const data1 = await sellerCustomerModel.findOne({ myId: sellerId });
      let myFriends1 = data1?.myFriends || [];
      let index1 = myFriends1.findIndex(f => f.fdId === userId);
      while (index1 > 0) {
        let temp1 = myFriends1[index1];
        myFriends1[index1] = myFriends1[index1 - 1];
        myFriends1[index1 - 1] = temp1;
        index1--;
      }
      // FIX: key should be myFriends, not myFriends1
      await sellerCustomerModel.updateOne({ myId: sellerId }, { myFriends: myFriends1 });

      return responseReturn(res, 201, { message });
    } catch (error) {
      ;
      return responseReturn(res, 500, { error: 'Server error' });
    }
  }

  get_customers = async (req, res) => {
    const { sellerId } = req.params;
    try {
      const data = await sellerCustomerModel.findOne({ myId: sellerId });
      return responseReturn(res, 200, { customers: data?.myFriends || [] });
    } catch (error) {
      ;
      return responseReturn(res, 500, { error: 'Server error' });
    }
  }

  get_customer_seller_message = async (req, res) => {
    const { customerId } = req.params;
    const { id } = req; // seller id from auth
    try {
      const messages = await sellerCustomerMessage.find({
        $or: [
          { $and: [{ receverId: { $eq: customerId } }, { senderId: { $eq: id } }] },
          { $and: [{ receverId: { $eq: id } }, { senderId: { $eq: customerId } }] }
        ]
      }).sort({ createdAt: 1 });

      const currentCustomer = await customerModel.findById(customerId);
      return responseReturn(res, 200, { messages, currentCustomer });
    } catch (error) {
      ;
      return responseReturn(res, 500, { error: 'Server error' });
    }
  }

  seller_message_add = async (req, res) => {
    const { senderId, text, receverId, name } = req.body;
    try {
      const message = await sellerCustomerMessage.create({
        senderId,
        senderName: name,
        receverId,
        message: text
      });

      // reorder for seller
      const data = await sellerCustomerModel.findOne({ myId: senderId });
      let myFriends = data?.myFriends || [];
      let index = myFriends.findIndex(f => f.fdId === receverId);
      while (index > 0) {
        let temp = myFriends[index];
        myFriends[index] = myFriends[index - 1];
        myFriends[index - 1] = temp;
        index--;
      }
      await sellerCustomerModel.updateOne({ myId: senderId }, { myFriends });

      // reorder for customer
      const data1 = await sellerCustomerModel.findOne({ myId: receverId });
      let myFriends1 = data1?.myFriends || [];
      let index1 = myFriends1.findIndex(f => f.fdId === senderId);
      while (index1 > 0) {
        let temp1 = myFriends1[index1];
        myFriends1[index1] = myFriends1[index1 - 1];
        myFriends1[index1 - 1] = temp1;
        index1--;
      }
      // FIX: key should be myFriends, not myFriends1
      await sellerCustomerModel.updateOne({ myId: receverId }, { myFriends: myFriends1 });

      return responseReturn(res, 201, { message });
    } catch (error) {
      ;
      return responseReturn(res, 500, { error: 'Server error' });
    }
  }

  // Admin side: list all sellers
  get_sellers = async (req, res) => {
    try {
      const sellers = await sellerModel.find({});
      return responseReturn(res, 200, { sellers });
    } catch (error) {
      ;
      return responseReturn(res, 500, { error: 'Server error' });
    }
  }

  // Admin/Seller -> message insert (one endpoint)
  // receverId: sellerId (admin->seller), '' (seller->admin legacy), or adminId (if you ever send explicitly)
  seller_admin_message_insert = async (req, res) => {
    const { receverId, message, senderName } = req.body;
    const senderId = req.id; // from authMiddleware

    if (!senderId) {
      return responseReturn(res, 401, { error: 'Please Login first' });
    }
    if (!message || !String(message).trim()) {
      return responseReturn(res, 400, { error: 'message is required' });
    }
    // receverId can be '' (legacy admin inbox). So only block null/undefined.
    if (receverId === undefined || receverId === null) {
      return responseReturn(res, 400, { error: 'receverId is required (can be empty string for admin inbox)' });
    }

    try {
      const messageData = await adminSellerMessage.create({
        senderId,
        receverId: typeof receverId === 'string' ? receverId : '',
        senderName: senderName || 'Admin',
        message: String(message),
      });
      return responseReturn(res, 200, { message: messageData });
    } catch (error) {
      ;
      return responseReturn(res, 500, { error: error.message || 'Server error' });
    }
  };

  // Admin reads chat with a seller (sellerId = receverId param)
  get_admin_messages = async (req, res) => {
    const { receverId } = req.params; // sellerId
    const { id } = req; // adminId
    try {
      const messages = await adminSellerMessage.find({
        $or: [
          // new scheme (real ids both sides)
          { senderId: id, receverId: receverId },
          { senderId: receverId, receverId: id },
          // legacy scheme (admin '')
          { senderId: receverId, receverId: '' },
          { senderId: '', receverId: receverId },
        ]
      }).sort({ createdAt: 1 });

      let currentSeller = {};
      if (receverId) {
        currentSeller = await sellerModel.findById(receverId);
      }
      return responseReturn(res, 200, { messages, currentSeller });
    } catch (error) {
      ;
      return responseReturn(res, 500, { error: 'Server error' });
    }
  }

  // Seller reads messages with admin
  get_seller_messages = async (req, res) => {
    const { id } = req; // sellerId
    try {
      const messages = await adminSellerMessage.find({
        $or: [
          { senderId: id },
          { receverId: id }
        ]
      }).sort({ createdAt: 1 });

      return responseReturn(res, 200, { messages });
    } catch (error) {
      ;
      return responseReturn(res, 500, { error: 'Server error' });
    }
  }
}

module.exports = new chatController();