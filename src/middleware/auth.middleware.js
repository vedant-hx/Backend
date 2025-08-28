import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models";

export const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("bearer", "")
        if(!token){
            throw new ApiError(401, "unauthorizes request")
        }
    
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
       const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
       if(!user){
            throw new ApiError(401, "invalid access token")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, "Invalid access token")
    }
})