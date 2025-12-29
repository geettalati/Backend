import { Router } from "express";
import { registeruser } from "../controllers/user.controller.js";
const router = Router()

router.route("/register").post(registeruser)
console.log(registeruser)

export default router