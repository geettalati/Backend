// asyncHandler wraps the controller so we don’t need try-catch everywhere
// any error thrown inside will be passed to Express error middleware
import { asyncHandler } from "../utils/asynchandler.js";

// Custom error class for sending structured API errors
import { ApiError } from "../utils/Apierror.js";

// User mongoose model
import { user } from "../models/user.models.js";

// Utility function to upload files to Cloudinary
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Standard success response format
import { ApiResponse } from "../utils/Apiresponse.js";

/*
|--------------------------------------------------------------------------
| REGISTER USER CONTROLLER
|--------------------------------------------------------------------------
| Handles user registration:
| 1. Get data from request body
| 2. Validate required fields
| 3. Check if user already exists
| 4. Upload avatar & cover image
| 5. Create user in DB
| 6. Remove sensitive fields
| 7. Send response
*/
const registeruser = asyncHandler(async (req, res) => {

    // ===============================
    // 1️⃣ Extract data from request body
    // ===============================
    const { fullname, email, username, password } = req.body;
    console.log("email:", email);

    // ===============================
    // 2️⃣ Validation: Check empty fields
    // ===============================
    // some() → returns true if ANY field is empty
    // trim() → removes extra spaces
    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // ===============================
    // 3️⃣ Check if user already exists
    // ===============================
    // ❌ MISTAKE IN YOUR CODE:
    // You forgot to use await
    // MongoDB queries are async
    const existedUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    // If user already exists → conflict
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // ===============================
    // 4️⃣ Handle file uploads
    // ===============================
    // req.files comes from multer
    // avatar is mandatory, coverImage is optional
    const avatarFilePath = req.files?.avatar?.[0]?.path;
    const coverImageFilePath = req.files?.coverimage?.[0]?.path;

    // Avatar is compulsory
    if (!avatarFilePath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // ===============================
    // 5️⃣ Upload images to Cloudinary
    // ===============================
    const avatar = await uploadOnCloudinary(avatarFilePath);
    const coverImage = coverImageFilePath
        ? await uploadOnCloudinary(coverImageFilePath)
        : null;

    // If avatar upload fails
    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // ===============================
    // 6️⃣ Create user in database
    // ===============================
    // ❌ MISTAKE IN YOUR CODE:
    // You were not storing created user
    const createdUser = await user.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverImage?.url || "",
        email,
        password, // password hashing should be done in pre-save hook
        username: username.toLowerCase()
    });

    // ===============================
    // 7️⃣ Remove sensitive fields before sending response
    // ===============================
    const safeUser = await user.findById(createdUser._id).select(
        "-password -refreshToken"
    );

    // If user creation failed
    if (!safeUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    // ===============================
    // 8️⃣ Send success response
    // ===============================
    return res.status(201).json(
        new ApiResponse(201, safeUser, "User created successfully")
    );
});

export { registeruser };
