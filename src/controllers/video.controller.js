import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const publishVideo = asyncHandler(async (req, res) => {
    
    //get video details from front-end
    const { title, description, duration } = req.body;

    //validation - nonEmpty
    if (!(title && description && duration)) {
        throw new ApiError(400, "All fields are required")
    }

    // get videoLocalPath 
    const videoLocalPath = req.files?.videoFile[0].path
    
    let thumbnailLocalPath ; 
    if (req.files.thumbnail == null ) {
        thumbnailLocalPath = "" ;
    }
    else{
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    if(!videoLocalPath){
        throw new ApiError(400, "Video file is required")
    }

    // Upload to cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile){
        throw new ApiError(400, "Video file is required")
    }


    //create video - create entry in db

    const video = new Video({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail?.url || "",
        duration
    });

    if (!video) {
        throw new ApiError(400, "video is not created")
    }

    const result = await video.save();
    console.log("New video created");
            
    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully"))
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 10, query, sortBy = 'name', sortType = 'asc', userId } = req.query
    // get all videos based on query, sort, pagination

    const videos = await Video.find(query)
    .sort(sortBy)
    .limit(pageSize)

    return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos fetched successfully"))

})


const getVideoById = asyncHandler(async (req, res) => {
    
    // get video by id
    const { videoId } = req.params
    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "Video has not found")
    }


    return res
    .status(200)
    .json(new ApiResponse(
        200,
        video,
        "Video fetched successfully"
    ))
})

const updateVideo = asyncHandler(async (req, res) => {
    
    //TODO: update video details like title, description, thumbnail
    const { title, description, thumbnail } = req.body
    try {
        if (!(title && description && thumbnail )) {
            throw new ApiError(400, "No any update is found")
        }

        if (title == null ) {
            title = ""
        }

        if (thumbnail == null ) {
            thumbnail = ""
        }

    } catch (error) {
        console.error()
    }


})

const deleteVideo = asyncHandler(async (req, res) => {
    
    //delete video
    // const { videoId } = req.params
    // const video = Video.findById(videoId)

    // console.log(video)

    // if (!video) {
    //     throw new ApiError(400, "Video is not found")
    // }
    const { videoId } = req.params
    const video = Video.findById(videoId)
    console.log(video);
    // const videoLocalPath = video.publicId

    // if(!videoLocalPath){
    //     throw new ApiError(400, "Video file is missing")
    // }

    
    // const result = deleteVideo(videoId)
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(400, 'Video not found');
    }

    video.active = !video.active;
    await video.save();

    return res
    .status(200)
    .json(new ApiResponse(200, {} , "toggleBar"))
})

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}