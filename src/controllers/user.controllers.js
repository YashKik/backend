import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import  jwt  from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndTokenRefreshToken = async(userId)=> {
    try {

        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken ,refreshToken }

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating acceessToken or refreshToken")
    }
}

const registerUser = asyncHandler( async (req, res)=>{
    // Get user detail from frontend
    const {fullname, username, email, password} = req.body;

    //validation - non empty
    
    /* if (fullname === "") {
        throw new ApiError(400,"fullname is required")
    } */

    if ([fullname, email, password, username].some((field)=>field?.trim() === "")) {
        throw new ApiError(400,"All fields required");
    }

    // Check if user is exist or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409,"Username or Email already exists");
    }

    // Check images or avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    
    let coverImageLocalPath ; 
    if (req.files.coverImage == null ) {
        coverImageLocalPath = "" ;
    }
    else{
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    //Upload them to cloudinary
    const avatar =  await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    //create user object -create entry in db
    const user =  await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //Remove password and refreshToken
    const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    //return Response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Succeessfully")
    )
})

const loginUser = asyncHandler(async (req, res )=> {

    // req body -> data

    const {username , email , password } = req.body;

    // username or email
    if (!(username || email) ) {
        throw new ApiError(400,"Email or username is requried");
    }

    // find a user
    const user = await User.findOne({
        $or:[ {username}, {email} ]
    });

    if (!user) {
        throw new ApiError(404,"User does not found!")
    };

    // password check
    const isPasswordValid = await user.isCorrectPassword(password);

    if (!isPasswordValid) {
        throw new ApiError(401,"Invalid user credentials")
    };

    // accessToken and refreshToken
    const { accessToken, refreshToken } = await generateAccessAndTokenRefreshToken(user._id);


    const loggedUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // send cookie

    const options = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, {
                user: loggedUser, accessToken , refreshToken
            },
            "User logged-in successfully"
        )
    )
})

const logoutUser = asyncHandler(async( req, res ) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            // $set: {
            //     refreshToken: undefined
            // }
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))

})

const refreshAccessToken = asyncHandler(async( req, res ) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id);
    
        if (!user) {
            throw new ApiError(401, "Invalid refreshToken")
        }
        
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        };
    
        const { accessToken, newRefreshToken } =  await generateAccessAndTokenRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken",newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "AccessToken refresh successfully"
            )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refreshToken")
    }
})

const changeCurrentPassword = asyncHandler(async( req , res ) =>{
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isCorrectPassword(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(new ApiResponse(200, {} , "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async( req , res ) =>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async( req , res )=> {
    const { fullname , email } = req.body;

    if (!(fullname || email)) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user , "Account details update successfully"))

})

const updateUserAvatar = asyncHandler(async(req , res)=> {
    const avatarLocalPath =  req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(400, "Error while uploading the avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar : avatar.url
            }
        },
        {new: true}
    ).select("-password")

    user.coverImage

    return res
    .status(200)
    .json(new ApiResponse(200, user , "Avatar is updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req , res)=> {

    const oldUrl = req.user.coverImage
    const coverImageLocalPath =  req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage){
        throw new ApiError(400, "Error while uploading the coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req , res ) =>{
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fatched successfully"))
})

const getWatchHistory = asyncHandler(async( req , res ) =>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: 
                            {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user[0].watchHistory,
        "watch history fatched successfully"
    ))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser ,
    updateAccountDetails ,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory 
};