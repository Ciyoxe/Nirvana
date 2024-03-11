import "dotenv/config";
import express from "express";
import auth_router from "./api/auth/router";
import auth_midw   from "./api/auth/middleware";


express()

.use(express.json({ limit : "10mb" }))

.use("/auth", auth_router)

.get("/", (req, res) => {
    
})

.listen(3000, () => 
    console.log("Listening on port 3000")
);
