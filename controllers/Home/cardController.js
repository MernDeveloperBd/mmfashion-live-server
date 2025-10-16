const cardModel = require("../../models/cardModel")
const wishlistModel = require("../../models/wishlistModel")
const { responseReturn } = require("../../utils/response")
const { mongo: { ObjectId } } = require('mongoose')

class cardController {
  add_to_card = async (req, res) => {
    const { userId, productId, quantity, color = '', size = '' } = req.body
    try {
      // একই productId + userId + color + size হলে ডুপ্লিকেট ধরে
      const exist = await cardModel.findOne({
        userId,
        productId,
        color: color || '',
        size: size || ''
      })
      if (exist) {
        return responseReturn(res, 404, { error: 'Product already added to card' })
      }
      const product = await cardModel.create({
        userId,
        productId,
        quantity: Number(quantity) || 1,
        color: color || '',
        size: size || ''
      })
      return responseReturn(res, 201, { message: 'Add to card success', product })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Add to card failed' })
    }
  }

  // get card product
  get_card_products = async (req, res) => {
    const co = 1;
    const { userId } = req.params
    try {
      const card_products = await cardModel.aggregate([
        { $match: { userId: { $eq: new ObjectId(userId) } } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: "_id",
            as: 'products'
          }
        }
      ])
      let buy_product_item = 0
      let calculatePrice = 0;
      let card_product_count = 0;

      const outOfStockProduct = card_products.filter(p => (p.products?.[0]?.stock || 0) < p.quantity)
      for (let i = 0; i < outOfStockProduct.length; i++) {
        card_product_count += outOfStockProduct[i].quantity
      }

      const stockProduct = card_products.filter(p => (p.products?.[0]?.stock || 0) >= p.quantity)
      for (let i = 0; i < stockProduct.length; i++) {
        const { quantity } = stockProduct[i]
        card_product_count += quantity
        buy_product_item += quantity
        const { price = 0, discount = 0 } = stockProduct[i].products[0] || {}
        if (discount !== 0) {
          calculatePrice += quantity * (price)
        } else {
          calculatePrice += quantity * price
        }
      }

      let p = []
      const unique = [...new Set(stockProduct.map(sp => sp.products?.[0]?.sellerId?.toString()).filter(Boolean))]
      for (let i = 0; i < unique.length; i++) {
        let price = 0;

        for (let j = 0; j < stockProduct.length; j++) {
          const temp = stockProduct[j]
          const tempProduct = temp.products[0]
          if (!tempProduct) continue;

          if (unique[i] === tempProduct.sellerId.toString()) {
            let pri = 0;
            if (tempProduct.discount !== 0) {
              pri = tempProduct.price - Math.floor((tempProduct.price * tempProduct.discount) / 100)
            } else {
              pri = tempProduct.price
            }
            pri = pri - Math.floor((pri * co) / 100)
            price = price + pri * temp.quantity

            // variant from card line
            const vColor = temp.color || ''
            const vSize = temp.size || ''
            const productInfo = {
              ...tempProduct,
              selectedColor: vColor,
              selectedSize: vSize
            }

            p[i] = {
              sellerId: unique[i],
              shopName: tempProduct.shopName,
              price,
              products: p[i]
                ? [
                    ...p[i].products,
                    {
                      _id: temp._id,           // card line id
                      quantity: temp.quantity,
                      color: vColor,           // expose for UI
                      size: vSize,             // expose for UI
                      productInfo
                    }
                  ]
                : [
                    {
                      _id: temp._id,
                      quantity: temp.quantity,
                      color: vColor,
                      size: vSize,
                      productInfo
                    }
                  ]
            }
          }
        }
      }

      return responseReturn(res, 200, {
        card_products: p,
        price: calculatePrice,
        card_product_count,
        shipping_fee: 130 * p.length,
        outOfStockProduct,
        buy_product_item
      })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Failed to fetch cart' })
    }
  }

  // delete
  delete_card_product = async (req, res) => {
    const { card_id } = req.params
    try {
      await cardModel.findByIdAndDelete(card_id)
      return responseReturn(res, 200, { message: 'Cart product deleted success' })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Delete failed' })
    }
  }

  quantity_inc = async (req, res) => {
    const { card_id } = req.params
    try {
      const product = await cardModel.findById(card_id)
      if (!product) return responseReturn(res, 404, { error: 'Cart item not found' })
      await cardModel.findByIdAndUpdate(card_id, { quantity: product.quantity + 1 })
      return responseReturn(res, 200, { message: 'Cart product increase' })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Increase failed' })
    }
  }

  quantity_dec = async (req, res) => {
    const { card_id } = req.params
    try {
      const product = await cardModel.findById(card_id)
      if (!product) return responseReturn(res, 404, { error: 'Cart item not found' })
      const next = Math.max(1, product.quantity - 1)
      await cardModel.findByIdAndUpdate(card_id, { quantity: next })
      return responseReturn(res, 200, { message: 'Cart product decrease' })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Decrease failed' })
    }
  }

  // wishlist (unchanged)
  add_wishlist = async (req, res) => {
    const { slug } = req.body
    try {
      const product = await wishlistModel.findOne({ slug })
      if (product) {
        return responseReturn(res, 404, { error: 'Allready added' })
      }
      await wishlistModel.create(req.body)
      return responseReturn(res, 201, { message: 'add to wishlist success' })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Add to wishlist failed' })
    }
  }

  get_wishlist = async (req, res) => {
    const { userId } = req.params;
    try {
      const wishlists = await wishlistModel.find({ userId })
      return responseReturn(res, 200, { wishlistCount: wishlists.length, wishlists })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Get wishlist failed' })
    }
  }

  delete_wishlist = async (req, res) => {
    const { wishlistId } = req.params
    try {
      await wishlistModel.findByIdAndDelete(wishlistId)
      return responseReturn(res, 200, { message: 'Remove success', wishlistId })
    } catch (error) {
     
      return responseReturn(res, 500, { error: 'Remove wishlist failed' })
    }
  }
}

module.exports = new cardController()