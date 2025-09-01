import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken
        const refreshToken = user.generateRefreshToken

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false})
        
        return {refreshToken, accessToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
    }
}
const registerUser = asyncHandler( async(req, res) => {


    console.log("req.body:", req.body);
console.log("req.files:", req.files);

    
    // get user details from frontend
    // validation - any filed should not be empty
    // check id user already exists
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    
    const { username, email, fullName, password } = req.body
   // console.log("email: ", email);

    if (  [
        fullName, password, email, username].some( (field) => field?.trim() === "" )) 
        {
            throw new ApiError(400, "all fields are required")
    }
    
   const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if(existedUser){
        throw new ApiError(409, "user with same email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverimageLocalPath = req.files?.coverImage[0]?.path
    
    let coverimageLocalPath;
    if( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverimageLocalPath = req.files.coverImage[0].path
    }
    if ( !avatarLocalPath ) {
        throw new ApiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverimageLocalPath)

     if ( !avatar ) {
        throw new ApiError(400, "avatar file is required")
    }

    const user = await User.create({
        fullName,
        password,
        username: username.toLowerCase(),
        coverImage: coverImage?.url || "",
        avatar: avatar.url,
        email
    })

   const createdUSer = await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if ( !createdUSer ) {
    throw new ApiError(500, "sometjing went wrong while registering the user")
   }

   return res.status(201).json(
    new apiResponse(200, createdUSer, "User created Successfully")
   )


} ) 


const loginUser = asyncHandler( async (req, res) => {
    // req body se data
    // username or email access
    // find the user in the database
    // check password
    // access and refresh token 
    // send cookies

    const { username, email, password } = req.body

    console.log(email)
    if(!username && ! email){
        throw new ApiError(400,"username or email is reqd.")
    }
    const user = await User.findOne({
        $or: [{ username}, { email}]
    })

    if (!user) {
        throw new ApiError(404, "user is not registered")        
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
        throw new ApiError(401, "Passwor dis incorrect")        
    }

   const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-refreshToken -password")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(
        new apiResponse(
            200,
            {
            user: loggedInUser, refreshToken, accessToken
            },
            "user logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined}
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new apiResponse(200, {}, "user logged out")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => 
    {
       const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if(!incomingRefreshToken){
            throw new ApiError(401, "unauthorized access")
        }
       try {
        const decodedToken = jwt.verify(
             incomingRefreshToken,
             process.env.REFRESH_TOKEN_SECRET
         )
         const user = await User.findById(decodedToken?._id)
         if(!user){
             throw new ApiError(401, "Invalid Refresh Toekn");
         }
          if (incomingRefreshToken != user?.refreshToken) {
             throw new ApiError(401, "refresh token is expired or used")
          }
 
         const options = {
             httpOnly: true,
             secure: true
         }
 
        const { newRefreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id)
 
         return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(
             new apiResponse(
                 200,
                 {accessToken, refreshToken: newRefreshToken},
                 "access token refreshed"
             )
         )
       } catch (error) {
            throw new ApiError(401, error?.message || "invalid refresh token")
       }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const{ oldPassword, newPassword,} = req.body

    const user = User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false})

    return res
    .status(200)
    .json(new apiResponse(200), {}, "password changed successfully")
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
.status(200)
.json(new apiResponse(200, req.user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    const {fullName, email} = req.body
    
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are reqd.")        
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "ccount details updated successfully")
    )
})

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is reqd")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
         throw new ApiError(400, "error while uploading avatar")

    }

   const user = await User.findByIdAndUpdate(
        user.req?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "avatar image uploaded successfully")
    )
})

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "avatar is reqd")
    }
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
         throw new ApiError(400, "error while uploading avatar")

    }

    const user = await User.findByIdAndUpdate(
        user.req?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "cover image uploaded sucessfully")
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if( !username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
            username: username.toLowerCase(),
            },
        },
        {
            $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers",
            },
        },
        {
            $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo",
            },
        },
        {
            $addFields: {
            subscribersCount: { $size: "$subscribers" },
            channelsSubscribedToCount: { $size: "$subscribedTo" },
            isSubscribed: {
                $cond: {
                if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                then: true,
                else: false,
                },
            },
            },
        },
        {
            $project: {
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            },
        },
        ]);


    if ( !channel?.length ) {
        throw new ApiError(400, "channel doesnt exist")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, channel[0], "user channel fetched successfully")
    )

})

const getUserWatchHistory = asyncHandler( async (req, res) => {

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
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
     return res
     .status(200)
     .json(
        new apiResponse(200, user[0].watchHistory, "Watch History fetched successfully")
     )
})

export {
     registerUser,
     loginUser,
     logoutUser, 
     refreshAccessToken, 
     changeCurrentPassword, 
     getCurrentUser, 
     updateAccountDetails, 
     updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile, 
    getUserWatchHistory }