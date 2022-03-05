//! Importing environment variables to connect to the database engine
import dotenv from "dotenv";
dotenv.config({ path: "./src/config/.env"}); // Loads .env file contents into process.env
// console.log(process.env)

//! Database engine connection
import { databaseEngine } from "./config/mongo.js"
await databaseEngine.connectToDatabaseEngine()

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

//! Cross-origin resource sharing
import cors from "cors"
app.use(cors())

//! Routers
import { regionBordersRouter } from "./routes/regionBordersData.js";
app.use('/', regionBordersRouter); // Import region border routes into the root path '/'
import { weatherRouter } from "./routes/weatherData.js";
app.use('/', weatherRouter); // Import weather routes into the root path '/'

//! Root route
app.get("/", function (request, response) {

    response.send("Root route for the backend container.")

});

//! Start server
app.listen(process.env.WEATHER_DATA_PORT, function () {
    console.log(`Weather data server started listening on port ${process.env.WEATHER_DATA_PORT}.`)
})