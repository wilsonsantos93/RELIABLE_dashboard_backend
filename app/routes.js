//! Express
import express from "express";
export let router = express.Router();

import { databaseEngine } from "./mongo.js"

router.get('/getWeatherData', function (request, response) {
    const weatherDashboardDatabase = databaseEngine.getConnection().db("weatherDashboard");
    const weatherDataCollection = weatherDashboardDatabase.collection("weatherData");
    const query = { "location.region": "Madeira" };
    const options = {
    // Include only the `title` and `imdb` fields in the returned document
    // projection: { _id: 0, title: 1, imdb: 1 },
    };
    weatherDataCollection.find(query, options).toArray(function(error, result) {
        if (error) throw error;
        console.log(result);
        response.send(result)
        databaseEngine.getConnection().close();
    });

});

 
// module.exports = router;
