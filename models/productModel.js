const { Schema, model } = require("mongoose");

const productSchema = new Schema({
    sellerId: {
        type: Schema.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    images: {
        type: Array,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    brand: {
        type: String
    },
    description: {
        type: String,
        required: true
    },
    shopName: {
        type: String,
    },
    fbProductLink: {
        type: String,
    },
    sku: {
        type: String,
    },
    price: {
        type: Number,
        required: true
    },
    oldPrice: {
        type: Number
    },
    stock: {
        type: Number
    },
    discount: {
        type: Number
    },
    resellingPrice: {
        type: Number
    }
}, {
    timestamps: true
})

productSchema.index({
    name: 'text',
    category: 'text',
    brand: 'text',
    description: 'text',
}, {
    weights: {
        name: 5,
        category: 4,
        brand: 3,
        description: 2,
    }
})

module.exports = model('products', productSchema)