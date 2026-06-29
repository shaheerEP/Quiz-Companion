import { v2 as cloudinary } from "cloudinary";

export async function deleteCloudinaryImage(url: string) {
  if (!url || !url.includes("cloudinary.com")) return;

  try {
    // Cloudinary config is automatically loaded from CLOUDINARY_URL
    const parts = url.split("/upload/");
    if (parts.length < 2) return;
    
    const path = parts[1];
    const pathParts = path.split("/");
    
    // Check if the first part is a version number (v followed by digits)
    if (pathParts[0].match(/^v\d+$/)) {
      pathParts.shift();
    }
    
    const fileWithExt = pathParts.join("/");
    const publicId = fileWithExt.substring(0, fileWithExt.lastIndexOf("."));
    
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted old profile image: ${publicId}`);
    }
  } catch (error) {
    console.error("Error deleting cloudinary image:", error);
  }
}
