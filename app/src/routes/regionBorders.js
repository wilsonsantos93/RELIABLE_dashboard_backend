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

//! Page that allows a client to select a geoJSON document to be saved to the database collection, or delete the already existing collection
regionBordersRouter.get("/regionBorders", function (request, response) {
  response.sendFile("uploadJSON.html", { root: "./src/views" });
});

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

//! Client requests the region borders collection to be deleted
import { handleDeleteRegionBorders } from "../handlers/regionBorders.js";
regionBordersRouter.post("/deleteRegionBorders", async function (request, response) {
  await handleDeleteRegionBorders(request, response);
});

//! Client requests the CRSs collection to be deleted
import { handleDeleteCRSs } from "../handlers/regionBorders.js";
regionBordersRouter.post("/deleteCRS", async function (request, response) {
  await handleDeleteCRSs(request, response);
});

//! Calculate centers of each feature in the database route
//TODO: If the centers were already calculated, warn the client, and don't calculate them again
import polygonCenter from "geojson-polygon-center";
regionBordersRouter.get(
  "/calculateCenters",
  async function (request, response) {
    console.log(
      "Client requested to calculate the centers for each region border in the collection."
    );

    //* Check if the region border collection exists
    let regionBordersCollectionName =
      DatabaseEngine.getRegionBordersCollectionName();
    let regionBordersCollectionExists = await collectionExistsInDatabase(
      regionBordersCollectionName,
      DatabaseEngine.getDashboardDatabase()
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
      response.send(
        "Can't calculate centers because the region borders collection doesn't exist."
      );
    }

    //* If the region borders collection exists, calculate and update the centers of each feature in the collection
    else if (regionBordersCollectionExists) {
      //* Query the region borders collection for the various features

      // The query results are going to be used by server to calculate the center of each and all features (geometry field), and save it to the corresponding feature (using the id).
      // As such, the properties don't need to be returned, and the center coordinates of each region don't need to be returned (because they shouldn't exist yet).
      let featuresQueryProjection = {
        _id: 1,
        properties: 0,
        center: 0,
        crsObjectId: 0,
      };
      let featuresQueryResults = await queryAllRegionBordersFeatures(
        featuresQueryProjection
      );

      for (const feature of featuresQueryResults) {
        // Calculate centre point of the feature
        let center = polygonCenter(feature.geometry);

        // Add the centre data to the feature in the database
        DatabaseEngine.getRegionBordersCollection().updateOne(
          { _id: feature._id }, // Updates the region feature document that has the same id as the current feature
          {
            $set: {
              center: center,
            },
          }
        );
      }
      sendResponseWithGoBackLink(
        response,
        "Successfully calculated centers coordinates for each feature in the region borders collection."
      );
    }
  }
);
