import { handleGetWeatherDates, handleFetchWeather, handleSaveWeather } from "../controllers/api/weather.js";
import { Role } from "../models/User.js";
import { Router } from "express";
import { authenticateAPI } from "../utils/routes.js";

const router = Router();

//! Route that requests the current weather for each FeatureCenter of each feature found in the region borders collection
router.post("/fetch", async function (request, response) {
    await handleFetchWeather(request, response); 
});

//! Route that requests the various dates the weather information was saved at
router.get("/dates", async function (request, response) {
    await handleGetWeatherDates(request, response); 
});

//! Route that receives weather data from external source
router.post("/save", authenticateAPI(Role.DATA), async function (request, response) {
    await handleSaveWeather(request, response); 
});



export default router;