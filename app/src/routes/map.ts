import { handleGetRegionBordersAndWeatherByDate } from "../controllers/map.js";

//! Express
import { Router } from "express";

const router = Router();

//! Get region borders and respective weather data route
router.get("/getRegionBordersAndWeather", async function (request, response) {
    await handleGetRegionBordersAndWeatherByDate(request, response);
});


//! Root route
/* router.get("/", async function (request, response) {
    // response.send("Root route for the backend container.")
    // response.render("map.ejs", {weatherDates: await getWeatherDates()});
}); */

export default router;