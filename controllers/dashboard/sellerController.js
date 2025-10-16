const sellerModel = require("../../models/sellerModel");
const { responseReturn } = require("../../utils/response");

class sellerController {
  // pending seller requests with optional search
  get_seller_request = async (req, res) => {
    let { page = 1, searchValue = '', perPage = 10 } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);
    const skipPage = perPage * (page - 1);

    try {
      if (searchValue) {
        const regex = new RegExp(searchValue, 'i');
        const query = {
          status: 'pending',
          $or: [
            { name: regex },
            { email: regex },
            { 'shopInfo.shopName': regex },
          ]
        };

        const sellers = await sellerModel
          .find(query)
          .skip(skipPage)
          .limit(perPage)
          .sort({ createdAt: -1 });

        const totalSeller = await sellerModel.countDocuments(query);

        return responseReturn(res, 200, { totalSeller, sellers });
      } else {
        const sellers = await sellerModel
          .find({ status: 'pending' })
          .skip(skipPage)
          .limit(perPage)
          .sort({ createdAt: -1 });

        const totalSeller = await sellerModel
          .countDocuments({ status: 'pending' });

        return responseReturn(res, 200, { totalSeller, sellers });
      }
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  }

  // get single seller
  get_seller = async (req, res) => {
    const { sellerId } = req.params;
    try {
      const seller = await sellerModel.findById(sellerId);
      return responseReturn(res, 200, { seller });
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  }

  // update seller status
  seller_status_update = async (req, res) => {
    const { sellerId, status } = req.body;
    try {
      await sellerModel.findByIdAndUpdate(sellerId, { status });
      const seller = await sellerModel.findById(sellerId);
      return responseReturn(res, 200, { seller, message: "Seller status update" });
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  }

  // active sellers
  get_active_sellers = async (req, res) => {
    let { page = 1, searchValue = '', perPage = 10 } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);
    const skipPage = perPage * (page - 1);

    try {
      let sellers = [];
      let totalSeller = 0;

      if (searchValue) {
        const sellersQuery = {
          status: 'active',
          $text: { $search: searchValue }
        };
        sellers = await sellerModel.find(sellersQuery).skip(skipPage).limit(perPage).sort({ createdAt: -1 });
        totalSeller = await sellerModel.countDocuments(sellersQuery);
      } else {
        const query = { status: 'active' };
        sellers = await sellerModel.find(query).skip(skipPage).limit(perPage).sort({ createdAt: -1 });
        totalSeller = await sellerModel.countDocuments(query);
      }

      return responseReturn(res, 200, { totalSeller, sellers });
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  }

  // deactive sellers
  get_deactive_sellers = async (req, res) => {
    let { page = 1, searchValue = '', perPage = 10 } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);
    const skipPage = perPage * (page - 1);

    try {
      let sellers = [];
      let totalSeller = 0;

      if (searchValue) {
        const sellersQuery = {
          status: 'deactive',
          $text: { $search: searchValue }
        };
        sellers = await sellerModel.find(sellersQuery).skip(skipPage).limit(perPage).sort({ createdAt: -1 });
        totalSeller = await sellerModel.countDocuments(sellersQuery);
      } else {
        const query = { status: 'deactive' };
        sellers = await sellerModel.find(query).skip(skipPage).limit(perPage).sort({ createdAt: -1 });
        totalSeller = await sellerModel.countDocuments(query);
      }

      return responseReturn(res, 200, { totalSeller, sellers });
    } catch (error) {
      return responseReturn(res, 500, { error: error.message });
    }
  }
}

module.exports = new sellerController();