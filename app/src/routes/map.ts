import {DatabaseEngine} from "../configs/mongo.js";
import {handleGetRegionBordersAndWeatherByDate} from "../controllers/map.js";

//! Express
import express from "express";

export let mapRouter = express.Router();

//! Get region borders and respective weather data route
mapRouter.get("/getRegionBordersAndWeather/:weatherDateID", async function (request, response) {
    await handleGetRegionBordersAndWeatherByDate(request, response);
});


//! Root route
mapRouter.get("/", async function (request, response) {
    // response.send("Root route for the backend container.")
    // response.render("map.ejs", {weatherDates: await getWeatherDates()});
});
