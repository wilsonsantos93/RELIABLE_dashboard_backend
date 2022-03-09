//! Express
import express from "express";
export let weatherRouter = express.Router();

//! Database engine connection
import { DatabaseEngine } from "../configs/mongo.js";

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
import { handleSaveWeather } from "../handlers/weather.js";
weatherRouter.get("/saveWeather", async function (request, response) {
  await handleSaveWeather(request, response);
});

async function saveWeatherData(weatherData) {
  const weatherDashboardDatabase =
    DatabaseEngine.getConnection().db("weatherDashboard");
  const weatherDataCollection =
    weatherDashboardDatabase.collection("weatherData");
  const result = await weatherDataCollection.insertOne(weatherData);
  console.log("Weather data saved to the database.");
}
// let weatherDataJSON = await getWeatherData();
// await saveWeatherData(weatherDataJSON)
