
//! Express
import express from "express";
export let librariesRouter = express.Router();

//! Get proj4.js library route
librariesRouter.get("/proj4.js", function (request, response) {
    response.sendFile("proj4.js", {root: "./src/lib"})
});

//! Get proj4leaflet.js library route
librariesRouter.get("/proj4leaflet.js", function (request, response) {
    response.sendFile("proj4leaflet.js", {root: "./src/lib"})
});
 