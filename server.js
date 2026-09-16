const express=require("express");
const dotenv=require("dotenv");
const mongoose = require("mongoose");
const shortid=require("shortid");
const rateLimit = require("express-rate-limit");
const Url = require("./models/Url");
const { createClient } = require("redis");



dotenv.config();

const app=express();

const redisClient = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    }
});

redisClient.on("error", (error) => {
    console.log("Redis Client Error:", error.message);
});

const shortenLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many requests. Please try again later."
});


app.use(express.json());
app.use(express.static("public"));

app.get("/",(req,res)=>{
    res.send("URL Shortener APT is running!");
});
app.get("/health", (req, res) => {
    res.json({
        status: "OK"
    });
});

app.post("/shorten", shortenLimiter, async(req,res)=>{
    try{
        const { originalUrl } =req.body;
        const existingUrl= await Url.findOne({
            originalUrl:originalUrl
        });

        if(existingUrl){
            return res.json(existingUrl);
        }

        const shortCode=shortid.generate();
        const url = await Url.create({
            originalUrl: originalUrl,
            shortCode:shortCode
        });
        res.json(url);

    }
    catch(error){
        res.status(500).json({
            message:"Something went wrong"
        });
    }

});

app.get("/analytics/:shortCode",async(req,res)=>{
    try{
        const { shortCode }=req.params;

        const url=await Url.findOne({
            shortCode:shortCode
        });

        if(!url){
        return res.status(404).json({
            message: "Short URL not found"
        });
        }
        res.json({
            originalUrl:url.originalUrl,
            shortCode:url.shortCode,
            clicks:url.clicks
        });
    }
    catch(error){
        res.status(500).json({
            message:"Something went wrong"
        });
    }
});
const PORT = process.env.PORT || 5000;



app.get("/:shortCode",async(req,res)=>{
    try{
    const { shortCode } = req.params;

    const cachedUrl = await redisClient.get(shortCode);

if (cachedUrl) {
    console.log("Cache HIT");

    await Url.updateOne(
        { shortCode: shortCode },
        { $inc: { clicks: 1 } }
    );

    return res.redirect(cachedUrl);
}

console.log("Cache MISS");
const url = await Url.findOne({
    shortCode: shortCode});
    if(!url){
        return res.status(404).send("Short URL not found");
    }
    await redisClient.set(
    shortCode,
    url.originalUrl,
    {
        EX: 3600
    }
);

    url.clicks =url.clicks+1;

    await url.save();

    res.redirect(url.originalUrl);
    }catch(error){
    res.status(500).send("Something went wrong");
    }
});





mongoose.connect(process.env.MONGO_URI)
    .then(async() => {
        console.log("MongoDB connected");

        await redisClient.connect();
        console.log("Redis connected");

        app.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });
    })
    .catch((error) => {
        console.log("MongoDB connection failed:", error.message);
    });


