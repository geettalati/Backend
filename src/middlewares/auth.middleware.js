import jwt from "jsonwebtoken";
import { ApiError } from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { user } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const foundUser = await user
            .findById(decodedToken?._id)
            .select("-password -refreshToken");

        if (!foundUser) {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = foundUser;
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid access token");
    }
});
