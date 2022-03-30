import {
    handleDeleteAll,
    handleDeleteRegionBorders,
    handleDeleteWeather,
    handleDeleteWeatherDates,
} from "../handlers/databaseDeletes.js";

//! Express
import express from "express";

export let databaseDeletesRouter = express.Router();

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

