import {handleGetWeatherDates, handleSaveWeather} from "../controllers/weather.js";

//! Express
import { Router } from "express";
const weatherRouter = Router();

//! Route that requests the current weather for each FeatureCenter of each feature found in the region borders collection
weatherRouter.post("/saveWeather", async function (request, response) {
    await handleSaveWeather(request, response); 
});

//! Route that requests the various dates the weather information was saved at
weatherRouter.get("/getWeatherDates", async function (request, response) {
    await handleGetWeatherDates(request, response); 
});

export default weatherRouter;