import { asyncHandler } from "../utils/asynchandler.js";

export const registeruser = asyncHandler(async (req ,res) =>{
    res.status(500).json({
        message:"ok"
    })
 })