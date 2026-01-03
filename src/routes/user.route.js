import { Router } from "express";
import { registeruser, loginuser, logoutuser, refreshaccesstoken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
console.log("--- USER ROUTER INITIALIZED ---");

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverimage", maxCount: 1 }
    ]),
    registeruser
);

// Added a debug log specifically for the login route hit
router.route("/login").post((req, res, next) => {
    console.log("DEBUG: Login route hit in user.route.js");
    next();
}, loginuser);

router.route("/logout").post(verifyJWT, logoutuser);

router.route("/refresh-token").post(refreshaccesstoken)

export default router;