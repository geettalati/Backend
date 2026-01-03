import mongoose, { Schema } from "mongoose";

const subschema = new Schema({
    subsciber:{
        type:Schema.Types.ObjectId,
        ref:user
    },
    channel:{
        type:Schema.Types.ObjectId,
        ref:user
    }

},{timsestamps:true})

export const subs = mongoose.model("subs" , subschema)