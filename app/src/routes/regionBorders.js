import {
  saveCRS,
  saveFeatures,
  associateCRStoFeatures,
  queryAllRegionBordersFeatures,
  collectionExistsInDatabase,
} from "../utils/database.js";

//! // Appends to a message a HTML link so the browser user can go back a page, and sends it
import sendResponseWithGoBackLink from "../utils/response.js";

//! Express
import express from "express";
export let regionBordersRouter = express.Router();

//! Database engine connection
import { DatabaseEngine } from "../configs/mongo.js";

//! Get region borders data route
import { handleGetRegionBorders } from "../handlers/regionBorders.js";
regionBordersRouter.get(
  "/getRegionBorders",
  async function (request, response) {
    await handleGetRegionBorders(request, response);
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
    await handleSaveRegionBorders(request, response);
  }
);

//! Calculate centers of each feature in the database route
//TODO: If the centers were already calculated, warn the client, and don't calculate them again
import { handleCalculateCenters } from "../handlers/regionBorders.js";
regionBordersRouter.get(
  "/calculateCenters",
  async function (request, response) {
    await handleCalculateCenters(request, response);
  }
);

