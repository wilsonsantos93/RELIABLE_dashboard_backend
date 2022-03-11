import {
  handleSaveWeather,
  handleGetWeatherDates,
} from "../handlers/weather.js";


//! Express
import express from "express";
export let weatherRouter = express.Router();

//! Route that requests the current weather for each center of each feature found in the region borders collection
weatherRouter.post("/saveWeather", async function (request, response) {
  handleSaveWeather(request, response);
});

//! Route that requests the various dates the weather informations were saved
weatherRouter.get("/getWeatherDates", async function (request, response) {
  handleGetWeatherDates(request, response);
});
