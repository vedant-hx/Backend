import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // ensure absolute path
    const absolutePath = path.resolve(localFilePath);

    // upload file to cloudinary
    const response = await cloudinary.uploader.upload(absolutePath, {
      resource_type: "auto",
    });

    // file uploaded successfully, delete local file
    fs.unlinkSync(absolutePath);
    return response;
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);  // 👈 log actual error
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // cleanup only if exists
    }
    return null;
  }
};

export { uploadOnCloudinary };
