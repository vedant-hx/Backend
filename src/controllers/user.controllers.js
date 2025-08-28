import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";

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
const registerUser = asyncHandler( async (req, res) => {


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

    if(!username || ! email){
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
export { registerUser, loginUser, logoutUser }