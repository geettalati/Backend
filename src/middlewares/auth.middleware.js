import jwt from "jsonwebtoken";
import { ApiError } from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { user } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    console.log("--- AUTH MIDDLEWARE STARTED ---");
    
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        console.log("STEP 1: Token extracted:", token ? "Token Found" : "MISSING");

        if (!token) {
            console.log("ERROR: No token provided in cookies or headers");
            throw new ApiError(401, "Unauthorized request");
        }

        console.log("STEP 2: Verifying JWT with Secret...");
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("STEP 3: Token decoded successfully. User ID:", decodedToken?._id);

        console.log("STEP 4: Fetching user from database...");
        const foundUser = await user
            .findById(decodedToken?._id)
            .select("-password -refreshToken");

        if (!foundUser) {
            console.log("ERROR: Decoded ID does not match any user in DB");
            throw new ApiError(401, "Invalid access token");
        }

        console.log("STEP 5: User authenticated:", foundUser.username);
        req.user = foundUser;
        
        console.log("--- AUTH MIDDLEWARE SUCCESS: MOVING TO NEXT ---");
        next();
    } catch (error) {
        console.log("ERROR in verifyJWT:", error?.message || error);
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});