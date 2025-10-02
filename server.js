const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const port = process.env.PORT
const dbConnect = require('./utils/db')
dbConnect()

app.use(cors({
    origin:['http://localhost:5173'],
    credentials:true
}))
app.use(bodyParser.json())
app.use(cookieParser())

//routes
const authRoute = require('./routes/authRoutes')
const categoryRoute = require('./routes/dashboard/categoryRoute')
const productRoute = require('./routes/dashboard/productRoute')


app.use('/api',authRoute)
app.use('/api', categoryRoute)
app.use('/api', productRoute)


app.get('/', (req, res) => res.send('Hello MM Fashion world!'))
app.listen(port, () => console.log(`MM Fashion world server is on port ${port}!`))