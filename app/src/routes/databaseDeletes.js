import {
    handleDeleteAll,
    handleDeleteCRSs,
    handleDeleteRegionBorders,
    handleDeleteWeather,
    handleDeleteWeatherDates,
<<<<<<< bb9fe8223ebc664432392fb89b00131405563d5c:app/src/routes/databaseDeletes.js
} from "../handlers/databaseDeletes.js";
=======
} from "../handlers/databaseDeletes";
>>>>>>> Added Typescript interfaces for weather geojson:app/src/routes/databaseDeletes.ts

//! Express
import express from "express";

export let databaseDeletesRouter = express.Router();

//! Client requests the CRSs collection to be deleted
databaseDeletesRouter.post("/deleteCRS", async function (request, response) {
    await handleDeleteCRSs(request, response);
});

//! Client requests the region borders collection to be deleted
databaseDeletesRouter.post(
    "/deleteRegionBorders",
    async function (request, response) {
        await handleDeleteRegionBorders(request, response);
    }
);

//! Route that requests the weather saved dates in the database to be deleted
databaseDeletesRouter.post(
    "/deleteWeatherDates",
    async function (request, response) {
        await handleDeleteWeatherDates(request, response);
    }
);

//! Route that requests the weather information in the database to be deleted
databaseDeletesRouter.post(
    "/deleteWeather",
    async function (request, response) {
        await handleDeleteWeather(request, response);
    }
);

//! Route that requests the weather information in the database to be deleted
databaseDeletesRouter.post("/deleteAll", async function (request, response) {
    await handleDeleteAll(request, response);
});
