import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try {
        const conectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`);
        console.log(`\n MongoDB connected !! DB Host: ${conectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB connection error", error);
    }
}

export default connectDB;