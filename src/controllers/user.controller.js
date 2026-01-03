// asyncHandler is a wrapper function that catches async errors
// and forwards them to Express error-handling middleware
import { asyncHandler } from "../utils/asynchandler.js";

// ApiError is a custom error class used to throw errors
// with a status code and message (clean error handling)
import { ApiError } from "../utils/Apierror.js";

//  user imported multiple times in your original code
// This should be the Mongoose User model (import only once)
import { user } from "../models/user.models.js";

// uploadOnCloudinary uploads files from local storage
// to Cloudinary and returns the uploaded file info
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// ApiResponse is a custom success-response formatter
// Keeps API responses consistent
import { ApiResponse } from "../utils/Apiresponse.js";

// jsonwebtoken library used to verify & decode JWT tokens
import jwt from "jsonwebtoken";


/*
|--------------------------------------------------------------------------
| Generate Access & Refresh Token
|--------------------------------------------------------------------------
*/
const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        // Find the user document in MongoDB using userId
        const foundUser = await user.findById(userId);

        // Generate short-lived access token
        // Method defined in user schema (user.methods)
        const accessToken = foundUser.generateAccessToken();

        // Generate long-lived refresh token
        // Also defined in user schema
        const refreshToken = foundUser.generateRefreshToken();

        // Save refresh token in DB for future verification
        foundUser.refreshToken = refreshToken;

        // Save user without triggering validations again
        await foundUser.save({ validateBeforeSave: false });

        // Return both tokens to calling function
        return { accessToken, refreshToken };
    } catch (error) {
        // If anything fails, force user to login again
        throw new ApiError(500, "Please login again");
    }
};


/*
|--------------------------------------------------------------------------
| REGISTER USER
|--------------------------------------------------------------------------
*/
const registeruser = asyncHandler(async (req, res) => {

    // Extract user details from request body
    const { fullname, email, username, password } = req.body;

    // Check if any field is empty or missing
    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if a user already exists with same username OR email
    const existedUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    // If user already exists, stop registration
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Multer stores uploaded files inside req.files
    // avatar is mandatory, cover image is optional
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverimage?.[0]?.path;

    // If avatar file is missing, throw error
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload avatar image to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Upload cover image only if user provided it
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    // If avatar upload fails, stop process
    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // Create new user document in MongoDB
    const createdUser = await user.create({
        fullname,                       // user's full name
        avatar: avatar.url,             // avatar image URL
        coverimage: coverImage?.url || "", // optional cover image
        email,                          // email address
        password,                       // password (hashed by pre-save hook)
        username: username.toLowerCase()// store username in lowercase
    });

    // Fetch user again but remove sensitive fields
    const safeUser = await user
        .findById(createdUser._id)
        .select("-password -refreshToken");

    // Send success response
    return res.status(201).json(
        new ApiResponse(201, safeUser, "User registered successfully")
    );
});


/*
|--------------------------------------------------------------------------
| LOGIN USER
|--------------------------------------------------------------------------
*/
const loginuser = asyncHandler(async (req, res) => {

    // Extract credentials from request body
    const { username, email, password } = req.body;

    // Either username OR email must be present with password
    if ((!username && !email) || !password) {
        throw new ApiError(400, "Username or email and password are required");
    }

    // Find user using username OR email
    const foundUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    // If user does not exist, throw error
    if (!foundUser) {
        throw new ApiError(404, "User does not exist");
    }

    // Compare entered password with hashed password in DB
    const isPasswordValid = await foundUser.isPasswordCorrect(password);

    // If password does not match, stop login
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // Generate access & refresh tokens
    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(foundUser._id);

    // Cookie security options
    const options = {
        httpOnly: true, // prevents JS access (XSS protection)
        secure: process.env.NODE_ENV === "production"
    };

    // Fetch user again without sensitive fields
    const loggedInUser = await user
        .findById(foundUser._id)
        .select("-password -refreshToken");

    // Send response with cookies + user data
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});


/*
|--------------------------------------------------------------------------
| LOGOUT USER
|--------------------------------------------------------------------------
*/
const logoutuser = asyncHandler(async (req, res) => {

    // Remove refresh token from DB so it cannot be reused
    await user.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );

    // Cookie options
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };

    // Clear authentication cookies
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});


/*
|--------------------------------------------------------------------------
| REFRESH ACCESS TOKEN
|--------------------------------------------------------------------------
*/
const refreshaccesstoken = asyncHandler(async (req, res) => {

    // ❌ BUG FIX COMMENT:
    // refreshtoken.cookies is wrong
    // Correct source is req.cookies.refreshToken
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body.refreshToken;

    // If refresh token is missing, deny request
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    // Verify refresh token using secret key
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );

    // decodedToken contains user _id
    const decodedUser = await user.findById(decodedToken._id);

    // If user does not exist, token is invalid
    if (!decodedUser) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // Check if refresh token matches the one stored in DB
    if (incomingRefreshToken !== decodedUser.refreshToken) {
        throw new ApiError(401, "Refresh token expired");
    }

    // Cookie options
    const options = {
        httpOnly: true,
        secure: true
    };

    // Generate new access & refresh tokens
    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(decodedUser._id);

    // Send new tokens to client
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "Access Token Refreshed"
            )
        );
});


/*
|--------------------------------------------------------------------------
| EXPORT CONTROLLERS
|--------------------------------------------------------------------------
*/
export {
    registeruser,
    loginuser,
    logoutuser,
    refreshaccesstoken
};



/*
|--------------------------------------------------------------------------
| Change current password
|--------------------------------------------------------------------------
*/

// asyncHandler wraps the async function and automatically
// forwards any error to Express error-handling middleware
const changecurrentpassword = asyncHandler(async (req, res) => {

    // Destructure old and new passwords from request body
    const { oldpassword, newpassword } = req.body;

    // Find the currently logged-in user from database
    // req.user is set by JWT authentication middleware
    const foundUser = await user.findById(req.user?._id);

    // Safety check: if user not found in DB
    if (!foundUser) {
        throw new ApiError(404, "User not found");
    }

    // Compare entered old password with hashed password in DB
    // isPasswordCorrect is a method defined in user schema
    const isPasswordCorrect = await foundUser.isPasswordCorrect(oldpassword);

    // If old password does not match, deny password change
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    // Assign new password to user object
    // Password will be hashed automatically by pre-save hook
    foundUser.password = newpassword;

    // Save updated password to database
    // validateBeforeSave:false skips unnecessary validations
    await foundUser.save({ validateBeforeSave: false });

    // Send success response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully"
            )
        );
})

const currentuser = asyncHandler(async(req,res) =>{
    return res
    .status(200)
    .json(200  , req.user , "fetched successfully")
}) 


/*
|--------------------------------------------------------------------------
| Update avatar imgae
|--------------------------------------------------------------------------
*/


// asyncHandler catches async errors and passes them
// to Express error-handling middleware automatically
const updateAvatar = asyncHandler(async (req, res) => {

    // Extract local file path of uploaded avatar from multer
    // req.file exists because this route uses upload.single("avatar")
    const avatarLocalPath = req.file?.path;

    // If no avatar file is uploaded, stop execution
    if (!avatarLocalPath) {
        // 400 because client sent an invalid request
        throw new ApiError(400, "Avatar file is missing");
    }

    // Upload avatar image from local storage to Cloudinary
    // ❗ MUST use await because function is asynchronous
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // If Cloudinary upload fails or URL is missing
    if (!avatar?.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    // Update user's avatar field in MongoDB
    // req.user._id is available because of JWT auth middleware
    const updatedUser = await user
        .findByIdAndUpdate(
            req.user?._id,          // logged-in user's ID
            {
                $set: {
                    avatar: avatar.url // store Cloudinary URL
                }
            },
            {
                new: true            // return updated document
            }
        )
        .select("-password");        // remove password from response

    // Send success response back to client
    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser,
            "Avatar updated successfully"
        )
    );
});




export { registeruser, loginuser, logoutuser  , refreshaccesstoken , currentuser , changecurrentpassword};
