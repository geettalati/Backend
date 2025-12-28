import mongoose from "mongoose";
import { db_name } from "../constants.js";

const connectdb = async() =>{
    try {
        const connectioninstance = await mongoose.connect(`${process.env.MONGODB_URI}/{db_name}`)

        console.log(`\n Mongodb connected !! DB HOST : ${connectioninstance.connection.host}`)

        
    } catch (error) {
        console.error("errorrara" ,error)
        throw error
    }
}

export default connectdb