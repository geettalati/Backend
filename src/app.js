// Import Express framework to create server and handle routes
import express from "express";

// Import CORS middleware to control cross-origin requests
import cors from "cors";

// Import cookie-parser to read cookies from incoming requests
import cookieParser from "cookie-parser";

// Create an Express application instance
const app = express();

/* ===========================
   CORS CONFIGURATION
   =========================== */

// Enable CORS so frontend (React) can talk to backend
app.use(
  cors({
    // Allow requests only from this frontend origin
    // Example: http://localhost:3000
    origin: process.env.CORS_ORIGIN,

    // Allow cookies, authorization headers, sessions
    // Required for JWT in cookies, login, logout
    credentials: true,
  })
);

/* ===========================
   BODY PARSERS
   =========================== */

// Parse incoming JSON data (req.body)
// Limit size to prevent large payload attacks (DoS protection)
app.use(express.json({ limit: "16kb" }));

// Parse URL-encoded data (form submissions)
// extended:true allows nested objects
// limit again prevents abuse
app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);

/* ===========================
   STATIC FILES
   =========================== */

// Serve static files from "public" folder
// Example: images, pdfs, uploads
// Accessed via: http://localhost:8000/image.png
app.use(express.static("public"));

/* ===========================
   COOKIE PARSER
   =========================== */

// Parse cookies attached to incoming requests
// Makes cookies available as: req.cookies
// Essential for authentication using HttpOnly cookies
app.use(cookieParser());



// routes import 

import userRouter from './routes/user.route.js'

/* ===========================
   Routes declaration

   =========================== */


   app.use("/api/v1/users" , userRouter)



/* ===========================
   EXPORT APP
   =========================== */

// Export app so it can be used in index.js / server.js
export { app };
