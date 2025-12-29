import dotenv from "dotenv"
import connectdb from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

connectdb()
.then(()=>{
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`server is running at port : ${process.env.PORT}`)
    })

    app.on("error" ,(error) =>{
        console.log("error" ,error)
        throw error
    })

    
})
.catch((err)=>{
    console.log("MONGO DB Connection failed" , err)
})


/*
import express from "express"
const app = express()

(async()=>{
    try {
        
        await mongoose.connect(`${process.env.MONGODB_URI}/${db_name}`)
        app.on("error",(error)=>{
            console.log("err" , error)
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })

    } catch (error) {
        console.error("Error" ,error)
        throw err
    }
})()

*/
