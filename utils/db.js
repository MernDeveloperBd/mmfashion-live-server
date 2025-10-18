const { default: mongoose } = require("mongoose")

const dbConnect = async () => {
    try {
        if (process.env.mode === 'pro') {
            await mongoose.connect(process.env.DB_URL, {
                useNewURLParser: true              
                
            })
            console.log("db connected");
        } else {
            await mongoose.connect(process.env.DB_LOCAL_URL, {
                useNewURLParser: true
            })
             console.log("Local db connected");
        }
    } catch (error) {
        ;

    }
}

module.exports = dbConnect;