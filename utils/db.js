const { default: mongoose } = require("mongoose")

const dbConnect = async()=>{
    try {
        await mongoose.connect(process.env.DB_URL,{
            useNewURLParser:true })
            console.log('database connected ..');
            
    } catch (error) { 
        console.log(error.message);
        
    }
}

module.exports = dbConnect;