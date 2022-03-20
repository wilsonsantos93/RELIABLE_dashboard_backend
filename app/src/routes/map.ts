import {DatabaseEngine} from "../configs/mongo";
import {handleGetRegionBordersAndWeatherByDate} from "../handlers/map";

//! Express
import express from "express";

export let mapRouter = express.Router();

//! Get region borders and respective weather data route
mapRouter.get("/getRegionBordersAndWeather/:weatherDateID", async function (request, response) {
    await handleGetRegionBordersAndWeatherByDate(request, response);
});

// Returns a JSON with the various dates the weather was saved in the database
// TODO: Instead of passing the weather dates through EJS, make it a client side request
async function getWeatherDates() {
    let weatherDatesQuery = {}; // Query all weather dates to return to the client
    let weatherDatesProjection = {_id: 1, date: 1}; // Only the date itself needs to be returned by the query
    let weatherDatesQueryOptions = {
        projection: weatherDatesProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults = await DatabaseEngine.getWeatherDatesCollection()
        .find(weatherDatesQuery, weatherDatesQueryOptions)
        .toArray();

    return featuresQueryResults;
}

//! Root route
mapRouter.get("/", async function (request, response) {
    // response.send("Root route for the backend container.")
    response.render("map.ejs", {weatherDates: await getWeatherDates()});
});
