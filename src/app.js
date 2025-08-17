import express from "express";
import CookieParser from "cookieparser";
import cors from "cors";

const app = express()

app.use(cors( {
    credentials: true,
    origin: process.env.CORS_ORIGIN
}))

app.use(express.json({
    limit: "16kb"
}))

app.use(express.urlencoded({
    limit: "16kb"
}))
// for url purpose search = + in the url

app.use( CookieParser() )   //to safely access the cookies of the user
app.use( express.static("public")) // to keep the files recieved from the user

export { app }

