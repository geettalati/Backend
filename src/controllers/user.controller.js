import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/Apierror.js";
import { user } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import jwt, { decode } from "jsonwebtoken"
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
    console.log("STEP 1: Entered loginuser controller");
    const { username, email, password } = req.body;
    console.log("STEP 2: Request body received:", { username, email, password: password ? "******" : "MISSING" });

    if ((!username && !email) || !password) {
        console.log("ERROR: Missing credentials in request body");
        throw new ApiError(400, "Username or email and password are required");
    }

    console.log("STEP 3: Searching for user in database...");
    const foundUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    if (!foundUser) {
        console.log("ERROR: User not found in database");
        throw new ApiError(404, "User does not exist");
    }
    console.log("STEP 4: User found:", foundUser.username);

    console.log("STEP 5: Validating password...");
    const isPasswordValid = await foundUser.isPasswordCorrect(password);

    if (!isPasswordValid) {
        console.log("ERROR: Password validation failed");
        throw new ApiError(401, "Invalid credentials");
    }
    console.log("STEP 6: Password is valid");

    console.log("STEP 7: Generating tokens...");
    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(foundUser._id);

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };

    console.log("STEP 8: Fetching safe user data for response...");
    const loggedInUser = await user
        .findById(foundUser._id)
        .select("-password -refreshToken");

    console.log("STEP 9: Sending final 200 response");
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


const refreshaccesstoken = asyncHandler(async(req,res) =>{
    const incomingrefrestoken = refreshtoken.cookies.refreshToken || req.body.refreshToken

    if(!incomingrefrestoken){
        throw new ApiError(401, "unauthorised request")
    }

    const decodedtoken = jwt.verify(incomingrefrestoken , process.env.REFRESH_TOKEN_SECRET)

    const decodeduser = await user.findById(decodedtoken)

    if(!decodeduser){
        throw new ApiError(401, "Invalid refresh token")
    }
    
    if (incomingrefrestoken !== decodeduser?.refreshToken) {
        throw new ApiError (401, " refresh token is expired")
    }

    const options={
        httpOnly:true,
        secure:true
    }
    const {accessToken , newrefreshToken} = await generateAccessTokenAndRefreshToken(decodeduser?._id)

    return res
    .status(200)
    .cookie("accessToken" , accessToken,options)
    .cookie("refreshToken" , newrefreshToken , options )
    .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken:newrefreshToken},
            "Access Token Refreshed"
        )

    )
})

export { registeruser, loginuser, logoutuser  , refreshaccesstoken};
