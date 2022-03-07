//! Express
import express from "express";
export let weatherRouter = express.Router();

//! Database engine connection
import { DatabaseEngine } from "../config/mongo.js";

//! Middleware
// weatherRouter.use(express.urlencoded({extended: true}));
// router.use(express.json());

//! Get weather data route
weatherRouter.get("/getWeatherData", function (request, response) {
  const weatherDataCollection = DatabaseEngine.getWeatherCollection();

  const query = { "location.name": "Porto Santo" }; // Build database query for the specific location name

  // Include only the wind_kph and temp_c fields in the returned document
  const options = {
    projection: { _id: 0, "current.wind_kph": 1, "current.temp_c": 1 },
  };

  // Queries database and sends the information to the client that requested it
  weatherDataCollection.find(query, options).toArray(function (error, result) {
    if (error) throw error;
    // console.log(result);
    response.send(result);
    DatabaseEngine.getConnection().close();
  });
});

//! Route that requests the current weather for each center of each feature found in the region borders collection
weatherRouter.get("/saveWeather", function (request, response) {
  // The server requests an API for the weather in the center (center field) of all individual features saved in the region borders collection.
  // The server will then save the weather data to the weather collection, and associate it to the corresponding feature id (id field).s
  // As such, the geometry and properties of each region don't need to be returned.
  let featuresQueryProjection = { _id: 1, center: 1 };
  DatabaseEngine.getRegionBordersFeatures();
});
