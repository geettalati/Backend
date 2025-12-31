import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/Apierror.js";
import { user } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";

/*
|--------------------------------------------------------------------------
| Generate Access & Refresh Token
|--------------------------------------------------------------------------
*/
const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const foundUser = await user.findById(userId);

        const accessToken = foundUser.generateAccessToken();
        const refreshToken = foundUser.generateRefreshToken();

        foundUser.refreshToken = refreshToken;
        await foundUser.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Please login again");
    }
};

/*
|--------------------------------------------------------------------------
| REGISTER USER
|--------------------------------------------------------------------------
*/
const registeruser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    // validation
    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // check existing user
    const existedUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // files from multer
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverimage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // create user
    const createdUser = await user.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    const safeUser = await user
        .findById(createdUser._id)
        .select("-password -refreshToken");

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
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
        throw new ApiError(400, "Username or email and password are required");
    }

    const foundUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    if (!foundUser) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await foundUser.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(foundUser._id);

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };

    const loggedInUser = await user
        .findById(foundUser._id)
        .select("-password -refreshToken");

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
    await user.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});

export { registeruser, loginuser, logoutuser };
