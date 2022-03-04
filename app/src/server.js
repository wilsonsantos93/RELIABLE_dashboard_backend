//! Importing environment variables to connect to the database engine
import dotenv from "dotenv";
dotenv.config({ path: "./src/.env"}); // Loads .env file contents into process.env
// console.log(process.env)

//! Database engine connection
import { databaseEngine } from "./mongo.js"
await databaseEngine.connectToDatabase()

//! Get JSON from weather API and save it to the database
import fetch from 'cross-fetch';
async function getWeatherData() {
    const url = "http://api.weatherapi.com/v1/current.json?key=a1f415612c9543ea80a151844220103&q=Porto%20Santo&aqi=yes"
    const fetchSettings = { method: "Get" };
    const response = await fetch(url, fetchSettings);
    const weatherDataJSON = await response.json();
    return weatherDataJSON
}
async function saveWeatherData(weatherData) {
    const weatherDashboardDatabase = databaseEngine.getConnection().db("weatherDashboard");
    const weatherDataCollection = weatherDashboardDatabase.collection("weatherData");
    const result = await weatherDataCollection.insertOne(weatherData);
    console.log("Weather data saved to the database.");
};
// let weatherDataJSON = await getWeatherData();
// await saveWeatherData(weatherDataJSON)

//! Express
import express from "express";
let app = express();
import { router } from "./routes.js";

app.use('/', router); // Import my routes into the root path '/'

app.listen(process.env.WEATHER_DATA_PORT, function () {
    console.log(`Weather data server started listening on port ${process.env.WEATHER_DATA_PORT}.`)
})