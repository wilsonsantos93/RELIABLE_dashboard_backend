//! Express
import express from "express";
export let regionBordersRouter = express.Router();

//! Get region borders data route
import { handleGetRegionBorders } from "../handlers/regionBorders.js";
regionBordersRouter.get(
  "/getRegionBorders",
  async function (request, response) {
    handleGetRegionBorders(request, response);
  }
);

//! Client sends a geoJSON to be saved to the database
import { handleSaveRegionBorders } from "../handlers/regionBorders.js";
import multer from "multer";
const storage = multer.memoryStorage(); // Use RAM to temporarily store the received geoJSON, before parsing it and saving it to the database
const upload = multer({ storage: storage });
// https://stackoverflow.com/questions/31530200/node-multer-unexpected-field
regionBordersRouter.post(
  "/saveRegionBorders",
  upload.single("geojson"),
  async function (request, response) {
    handleSaveRegionBorders(request, response);
  }
);

//! Calculate centers of each feature in the database route
//TODO: If the centers were already calculated, warn the client, and don't calculate them again
import { handleCalculateCenters } from "../handlers/regionBorders.js";
regionBordersRouter.post(
  "/calculateCenters",
  async function (request, response) {
    handleCalculateCenters(request, response);
  }
);

