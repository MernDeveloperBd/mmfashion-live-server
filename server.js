const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const http = require('http')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const port = process.env.PORT
const socket = require('socket.io')

const server = http.createServer(app)

const dbConnect = require('./utils/db')
dbConnect()

app.use(cors({
    origin:process.env.mode === 'pro' ? [process.env.CLIENT_URLL, process.env.ADMIN_UR]:['http://localhost:5173','http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const io = socket(server, {
    cors: {
        origin: process.env.mode === 'pro' ? [process.env.CLIENT_URLL, process.env.ADMIN_UR]:['http://localhost:5173','http://localhost:5174'],
        credentials: true
    }
})

var allCustomer = []
var allSeller = []

const addUser = (customerId, socketId, userInfo) => {
    const checkUser = allCustomer.some(u => u.customerId === customerId)
    if (!checkUser) {
        allCustomer.push({
            customerId,
            socketId,
            userInfo
        })
    }
}

const addSeller = (sellerId, socketId, userInfo) => {
    const chaeckSeller = allSeller.some(u => u.sellerId === sellerId)
    if (!chaeckSeller) {
        allSeller.push({
            sellerId,
            socketId,
            userInfo
        })
    }
}

const findCustomer = (customerId) => {
    return allCustomer.find(c => c.customerId === customerId)
}
const findSeller = (sellerId) => {
    return allSeller.find(c => c.sellerId === sellerId)
}


const remove = (socketId) => {
    allCustomer = allCustomer.filter(c => c.socketId !== socketId)
    allSeller = allSeller.filter(c => c.socketId !== socketId)
}

let admin = {}

const removeAdmin = (socketId) => {
    if (admin.socketId === socketId) {
        admin = {}
    }
}

io.on('connection', (soc) => {

    soc.on('add_user', (customerId, userInfo) => {
        addUser(customerId, soc.id, userInfo)
        io.emit('activeSeller', allSeller)
        io.emit('activeCustomer', allCustomer)
    })
    soc.on('add_seller', (sellerId, userInfo) => {
        addSeller(sellerId, soc.id, userInfo)
        io.emit('activeSeller', allSeller)
        io.emit('activeCustomer', allCustomer)
        io.emit('activeAdmin', { status: true })
    })
    soc.on('add_admin', (adminInfo) => {
        delete adminInfo.email
        admin = adminInfo
        admin.socketId = soc.id
        io.emit('activeSeller', allSeller)
        io.emit('activeAdmin', { status: true })

    })

    soc.on('send_seller_message', (msg) => {
        const customer = findCustomer(msg.receverId)
        if (customer !== undefined) {
            soc.to(customer.socketId).emit('seller_message', msg)
        }

    })
    soc.on('send_customer_message', (msg) => {
        const seller = findSeller(msg.receverId)
        if (seller !== undefined) {
            soc.to(seller.socketId).emit('customer_message', msg)
        }
    })

    soc.on('send_message_admin_to_seller', msg => {
        const seller = findSeller(msg.receverId)
        if (seller !== undefined) {
            soc.to(seller.socketId).emit('receved_admin_message', msg)
        }
    })

    soc.on('send_message_seller_to_admin', msg => {

        if (admin.socketId) {
            soc.to(admin.socketId).emit('receved_seller_message', msg)
        }
    })

    soc.on('disconnect', () => {
        const wasAdmin = admin.socketId === soc.id;
        remove(soc.id);
        removeAdmin(soc.id);
        if (wasAdmin) {
            io.emit('activeAdmin', { status: false });
        }
        io.emit('activeSeller', allSeller);
        io.emit('activeCustomer', allCustomer);
    });


})

app.use(bodyParser.json())
app.use(cookieParser())

//routes
const homeRoutes = require('./routes/Home/homeRoutes')
const cartRoutes = require('./routes/Home/cardRoutes')
const orderRoutes = require('./routes/Home/Order/orderRoutes')
const customerAuthRoute = require('./routes/Home/customerAuthRoutes')
const authRoute = require('./routes/authRoutes')
const categoryRoute = require('./routes/dashboard/categoryRoute')
const productRoute = require('./routes/dashboard/productRoute')
const sellerRoute = require('./routes/dashboard/sellerRoute')
const chatRoutes = require('./routes/chatRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const dashboardIndexRoutes = require('./routes/dashboard/dashboardIndexRoutes')
const bannerRoutes = require('./routes/bannerRoutes')
const contactRoutes = require('./routes/contact');
const withdrawalRoutes = require('./routes/withdrawal.routes');
const analyticsRoutes = require('./routes/analyticsRoutes');

app.use('/api', analyticsRoutes);
app.use('/api', withdrawalRoutes);
app.use('/api', contactRoutes);
app.use('/api', bannerRoutes)
app.use('/api', paymentRoutes)
app.use('/api', dashboardIndexRoutes)


app.use('/api/home', homeRoutes)
app.use('/api', orderRoutes)
app.use('/api', cartRoutes)
app.use('/api', chatRoutes)
app.use('/api', authRoute)
app.use('/api', customerAuthRoute)
app.use('/api', categoryRoute)
app.use('/api', productRoute)
app.use('/api', sellerRoute)


app.get('/', (req, res) => res.send('Hello MM Fashion world!'))
server.listen(port, () => console.log(`MM Fashion world server is on port ${port}!`))