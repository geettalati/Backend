import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/Apierror.js";
import { user } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";

const registeruser = asyncHandler(async (req, res) => {
    // 1. Get data from body
    const { fullname, email, username, password } = req.body;

    // 2. Validation
    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // 3. Check if user exists
    const existedUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // 4. Check for files (Multer saves them to req.files)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverimage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // 5. Upload to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // 6. Create user object in DB
    const createdUser = await user.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverImage?.url || "", 
        email,
        password, 
        username: username.toLowerCase()
    });

    // 7. Remove sensitive info
    const safeUser = await user.findById(createdUser._id).select("-password -refreshToken");

    if (!safeUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
        new ApiResponse(201, safeUser, "User registered successfully")
    );
});

export { registeruser };