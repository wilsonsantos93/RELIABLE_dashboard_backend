import {handleGetWeatherDates, handleSaveWeather,} from "../controllers/weather.js";

//! Express
import express from "express";
export let weatherRouter = express.Router();

//! Route that requests the current weather for each FeatureCenter of each feature found in the region borders collection
weatherRouter.post("/saveWeather", async function (request, response) {
    await handleSaveWeather(request, response);
});

//! Route that requests the various dates the weather information was saved at
weatherRouter.get("/getWeatherDates", async function (request, response) {
    await handleGetWeatherDates(request, response);
});
