const { default: mongoose } = require("mongoose")

const dbConnect = async()=>{
    try {
        await mongoose.connect(process.env.DB_URL,{
            useNewURLParser:true })            
    } catch (error) { 
       ;
        
    }
}

module.exports = dbConnect;