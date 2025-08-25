import mongoose, { Schema, SchemaType } from "mongoose";
import bcrypt from "bcrypt";
import { JsonWebTokenError } from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
         username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
         },
         email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
         },
         fullname: {
            type: String,
            required: true,
            trim: true,
            index: true
         },
         avatar: {
            type: String,
            required: true
         },
         coverimage: {
            type: String
         },
         watchhistory: [{
            type: Schema.Types.ObjectId,
            ref: "Video"
         }
        ],
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshtoken: {

        }

    }, {timestamps: true} )


    userSchema.pre("save", async function(next) {
        if(!this.isModified("password")) return next
        this.password = await bcrypt.hash(this.password, 10)
        next()
    })

    userSchema.methods.isPasswordCorrect = async function(password) 
        {
            return await bcrypt.compare(password, this.password)
        
    }

    userSchema.methods.generateAccessToken = function() {
        JsonWebTokenError.sign({
            _id: this._id,
            fullname: this.fullname,
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRE
        }
    )
    }

    userSchema.methods.generateRefreshToken = function() {
        JsonWebTokenError.sign({
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRE
        }
    )
    }

export const User = mongoose.model("User", userSchema)