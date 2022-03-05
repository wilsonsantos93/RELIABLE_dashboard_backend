//! Express
import express from "express";
export let weatherRouter = express.Router();

//! Database engine connection
import { databaseEngine } from "../config/mongo.js"

//! Middleware
// weatherRouter.use(express.urlencoded({extended: true}));
// router.use(express.json());


//! Get weather data route
weatherRouter.get("/getWeatherData", function (request, response) {
    const weatherDashboardDatabase = databaseEngine.getConnection().db("weatherDashboard");
    const weatherDataCollection = weatherDashboardDatabase.collection("weatherData");
    
    const query = { "location.name": "Porto Santo" }; // Build database query for the specific location name

    // Include only the wind_kph and temp_c fields in the returned document
    const options = {
        projection: { "_id": 0, "current.wind_kph": 1, "current.temp_c": 1 },
    };

    // Queries database and sends the information to the client that requested it
    weatherDataCollection.find(query, options).toArray(function(error, result) {
        if (error) throw error;
        // console.log(result);
        response.send(result)
        databaseEngine.getConnection().close();
    });

});
