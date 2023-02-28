//! Express
import express from "express";

//! Get region borders data route
//! Client sends a geoJSON to be saved to the database
//! Calculate centers of each feature in the database route
import { handleGetRegionBorders, handleGetRegionBorderWithWeather } from "../../controllers/api/regions.js";

const router = express.Router();

router.get("/", async function (request, response) {
  await handleGetRegionBorders(request, response);
});

router.get("/:id", async function (request, response) {
  await handleGetRegionBorders(request, response);
});

router.get("/:id/weather", async function (request, response) {
  await handleGetRegionBorderWithWeather(request, response);
});

export default router;