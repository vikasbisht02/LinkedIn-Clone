import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors"


import authRoutes from "./routes/auth.route.js"
import userRoutes from "./routes/user.route.js"
import postRoutes from "./routes/post.route.js"
import NotificationRoutes from "./routes/notification.route.js"
import connectionRoutes from "./routes/connectionRoute.route.js"
import { connectDB } from "./lib/db.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT 

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    
}))
app.use(express.json({limit: "5mb"})) // parse json request bodies
app.use(cookieParser()) //parse cookie

app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/users", userRoutes)
app.use("/api/v1/posts", postRoutes)
app.use("/api/v1/notifications", NotificationRoutes)
app.use("/api/v1/connections", connectionRoutes)



app.listen(PORT, () =>  {
    console.log(`Server is running on port ${PORT}`);
    connectDB()
    
})






