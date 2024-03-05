import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})


connectDB()
.then(app.listen(process.env.PORT || 8000),() => {
    app.on("error",()=>{
        console.log("ERROR of listening",error);
        throw error;
    })
    console.log(`Server is running on ${process.env.PORT}.`);
})

.catch((err) =>{
    console.log("MongoDB connection failed!!" , err);
});






// import mongoose from "mongoose";
// import {DB_NAME} from "./constants";
// import express from "express";
// const app = express();

// (async () => {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error" , ()=>{
//             console.log("ERRROR",error);
//             throw error
//         })

//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port ${process.env.PORT}`);
//         })
//     }
//     catch(error){
//         console.error("ERROR",error)
//         throw err
//     }
// })