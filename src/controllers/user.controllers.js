import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    
    // get user details from frontend
    // validation - any filed should not be empty
    // check id user already exists
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // 
    //
    //
    //
    //
    //
    //
    
    const { username, email, fullName, password } = req.body
    console.log("email: ", email);

    if (  [
        fullName, password, email, username].some( (field) => field?.trim() === "" )) 
        {
            throw new ApiError(400, "all fields are required")
    }
    
   const existedUser = User.findOne({
        $or: [{ email }, { username }]
    })
    if(existedUser){
        throw new ApiError(409, "user with same email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverimageLocalPath = req.files?.coverImage[0]?.path
    
    if ( !avatarLocalPath ) {
        throw new ApiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverimageLocalPath)

     if ( !avatar ) {
        throw new ApiError(400, "avatar is required")
    }

    const await user = User.create({
        fullName,
        password,
        username: username.toLowerCase,
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

export { registerUser }