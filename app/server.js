//! Import require
import { createRequire } from "module";
const require = createRequire(import.meta.url);


//! Environment variables for the database connection
import dotenv from "dotenv";
dotenv.config(); // Loads .env file contents into process.env.
// console.log(process.env)


//! Connect to weather database
import { databaseEngine } from "./mongo.js"
databaseEngine.connectToDatabase()


//! Get JSON from weather API and save it to the database
const fetch = require("node-fetch");
let weatherDataJSON;
(async function () {
    const url = "http://api.weatherapi.com/v1/current.json?key=a1f415612c9543ea80a151844220103&q=Madeira&aqi=yes"
    const fetchSettings = { method: "Get" };
    const response = await fetch(url, fetchSettings);
    const weatherDataJSON = await response.json();
})();


//! Save JSON to the database
const weatherVisualizerDatabase = databaseEngine.getConnection().db("weatherDashboard");
const weatherDataCollection = weatherVisualizerDatabase.collection("weatherData");
const result = await weatherDataCollection.insertOne(weatherDataJSON);
console.log("Weather data JSON saved to the database.");


