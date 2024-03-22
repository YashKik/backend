import {v2 as cloudinary} from "cloudinary";
import fs from "fs";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath) return null
        //Upload the file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //File has been uploaded successfully
        console.log("File is uploaded successfully on cloudinary", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch(error){
        fs.unlinkSync(localFilePath) //Remove the locally saved temporary file as the uploaded operation got failed
        return null
    }
}

async function deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log('Image deleted successfully:', result);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

async function deleteVideo(video) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      console.log('Video deleted successfully:', result);
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  }

export {uploadOnCloudinary , deleteImage , deleteVideo }