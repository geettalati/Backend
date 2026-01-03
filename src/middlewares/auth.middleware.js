// Import jsonwebtoken library
// This is used to verify and decode JWT access tokens
import jwt from "jsonwebtoken";

// Import ApiError custom class
// Used to throw structured errors with HTTP status codes
import { ApiError } from "../utils/Apierror.js";

// Import asyncHandler
// This wraps async middleware so that any thrown error
// is automatically passed to Express error handler
import { asyncHandler } from "../utils/asynchandler.js";

// Import the User mongoose model
// Used to fetch authenticated user from the database
import { user } from "../models/user.models.js";


// Exporting verifyJWT middleware
// This middleware runs BEFORE protected routes
// It checks whether the request has a valid access token
export const verifyJWT = asyncHandler(async (req, res, next) => {

    // Debug log to know when authentication middleware starts
    console.log("--- AUTH MIDDLEWARE STARTED ---");

    try {
        // Extract access token from either:
        // 1️⃣ Cookies (preferred for browser-based auth)
        // 2️⃣ Authorization header (for mobile / API clients)
        //
        // Example header:
        // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        const token =
            req.cookies?.accessToken ||              // token from cookies
            req.header("Authorization")               // token from header
                ?.replace("Bearer ", "");             // remove "Bearer " prefix

        // Log whether token exists (never log actual token in production)
        console.log("STEP 1: Token extracted:", token ? "Token Found" : "MISSING");

        // If no token was provided in request, deny access
        if (!token) {
            console.log("ERROR: No token provided in cookies or headers");

            // 401 = Unauthorized (user is not authenticated)
            throw new ApiError(401, "Unauthorized request");
        }

        // Verify JWT token using secret key
        // If token is:
        // - expired
        // - tampered
        // - signed with wrong secret
        // jwt.verify will throw an error
        console.log("STEP 2: Verifying JWT with Secret...");
        const decodedToken = jwt.verify(
            token,                                  // access token string
            process.env.ACCESS_TOKEN_SECRET        // secret used to sign token
        );

        // decodedToken contains payload data embedded during token creation
        // Example payload: { _id, email, username, iat, exp }
        console.log(
            "STEP 3: Token decoded successfully. User ID:",
            decodedToken?._id
        );

        // Fetch user from database using decoded user ID
        console.log("STEP 4: Fetching user from database...");
        const foundUser = await user
            .findById(decodedToken?._id)            // match user ID
            .select("-password -refreshToken");     // exclude sensitive fields

        // If no user found, token is invalid or user was deleted
        if (!foundUser) {
            console.log("ERROR: Decoded ID does not match any user in DB");

            // Token is valid structurally but user is invalid
            throw new ApiError(401, "Invalid access token");
        }

        // If user exists, authentication is successful
        console.log("STEP 5: User authenticated:", foundUser.username);

        // Attach authenticated user to request object
        // This allows next controllers to access req.user
        req.user = foundUser;

        // Log successful authentication
        console.log("--- AUTH MIDDLEWARE SUCCESS: MOVING TO NEXT ---");

        // Pass control to next middleware or route handler
        next();

    } catch (error) {
        // Catch any error thrown during verification
        // (expired token, invalid signature, etc.)
        console.log("ERROR in verifyJWT:", error?.message || error);

        // Always respond with 401 for authentication failure
        throw new ApiError(
            401,
            error?.message || "Invalid access token"
        );
    }
});
