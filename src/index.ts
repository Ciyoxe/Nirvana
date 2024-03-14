import "dotenv/config";
import express, { ErrorRequestHandler } from "express";
import auth_router from "./api/auth/router";
import auth_midw   from "./api/auth/middleware";
import { ErrorHanlder } from "./utils";



express()

.use("/auth", auth_router)

.get("/", (req, res) => {
    
})

.listen(3000, () => 
    console.log("Listening on port 3000")
);
