import { v2 as cloudinary } from "cloudinary" 
// importing cloudinary v2 and renaming it as `cloudinary` for cleaner usage

import fs from "fs" 
// fs = File System module (used to delete local files after upload or on error)

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    // Cloudinary account name (comes from .env file for security)

    api_key: process.env.CLOUDINARY_API_KEY, 
    // Public API key to identify your Cloudinary account

    api_secret: process.env.CLOUDINARY_API_SECRET  
    // Secret key (must never be exposed in frontend)
    // Used by Cloudinary to authenticate your server
});

const uploadOnCloudinary = async (localfilepath) => {
    // This function uploads a file from local server storage to Cloudinary
    // localfilepath = path where multer / file upload stored the file temporarily

    try {
        if (!localfilepath) return null
        // Safety check: if file path is missing, exit early

        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto"
            // "auto" lets Cloudinary detect file type automatically
            // (image, video, pdf, etc.)
        })

        // file has beemn uploaded succesfully
        console.log("Filee has been uploaded in cloudinary", response.url)
        // response contains full upload details like:
        // url, secure_url, public_id, format, size, etc.

        return response
        // returning response so controller can save URL in database

    } catch (error) {

        fs.unlinkSync(localfilepath) 
        // file upload nhi hui toh isko server se toh hatana padega toh usko hatane
        // ke liye apan unlinkSync ka use karte hai jisse voh files agar upload nhi hui
        // hai toh atleast server ki faltu memory nhi khaaygi

        // IMPORTANT:
        // unlinkSync deletes the file immediately from local storage
        // This prevents disk from filling up with failed uploads

        return null
        // returning null so calling function knows upload failed
    }
}
