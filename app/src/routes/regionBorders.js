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
import { getRegionBorders } from "../handlers/regionBorders.js";
regionBordersRouter.get(
  "/getRegionBorders",
  async function (request, response) {
    console.log("Client requested region borders.");

    //* Check if the region border collection exists
    let regionBordersCollectionName =
      DatabaseEngine.getRegionBordersCollectionName();
    let regionBordersCollectionExists = await collectionExistsInDatabase(
      regionBordersCollectionName
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
      console.log("Couldn't get region borders because the collection doesn't exist.")
      sendResponseWithGoBackLink(
        response,
        "Couldn't get region borders because the collection doesn't exist."
      );
    }

    //* If the region borders collection exists, send the various saved geoJSONs to the client
    else if (regionBordersCollectionExists) {
      console.log("Started sending geoJSONs to the client.");
      let geoJSONs = await getRegionBorders();
      response.send(geoJSONs);
      console.log("Finished sending geoJSONs to the client.\n");
    }
  }
);

//! Page that allows a client to select a geoJSON document to be saved to the database collection, or delete the already existing collection
regionBordersRouter.get("/regionBorders", function (request, response) {
  response.sendFile("uploadJSON.html", { root: "./src/views" });
});

//! Client sends a geoJSON to be saved to the database
import multer from "multer";
const storage = multer.memoryStorage(); // Use RAM to temporarily store the received geoJSON, before parsing it and saving it to the database
const upload = multer({ storage: storage });
// https://stackoverflow.com/questions/31530200/node-multer-unexpected-field
regionBordersRouter.post(
  "/saveRegionBorders",
  upload.single("geojson"),
  async function (request, response) {
    //! Parse received file bytes to geoJSON
    console.log("Received geoJSON from the client.");
    let fileBuffer = request.file.buffer; // Multer enables the server to access the file sent by the client using "request.file.buffer". The file accessed is in bytes.
    let trimmedFileBuffer = fileBuffer.toString("utf-8").trimStart().trimEnd(); // Sometimes the geoJSON sent has unnecessary spaces that need to be trimmed
    let geoJSON = JSON.parse(trimmedFileBuffer); // Parse the trimmed file buffer to a correct geoJSON

    //! Save geoJSON to region borders collection and send response to the client

    //* Save geoJSON coordinate reference system to the collection
    // TODO: Error handling
    console.log(
      "Started inserting geoJSON coordinate reference system in the database."
    );
    let insertedCRSObjectId = await saveCRS(geoJSON);
    console.log(
      "Inserted geoJSON coordinate reference system in the database. CRS ID in database:",
      // To extract the ID string inside the ObjectId, we use ObjectId.toHexString
      insertedCRSObjectId.toHexString() // The ID string of the CRS document that was inserted in the database
    );

    //* Save each geoJSON feature to the collection individually
    // TODO: Error handling
    console.log("Starting inserting geoJSON features in the database.");
    let insertedFeaturesObjectIds = await saveFeatures(geoJSON);
    console.log("Inserted geoJSON features in the database.\n");

    //* Create a field with on each feature with its associated coordinates reference system
    console.log("Starting associating each feature with its CRS.");
    associateCRStoFeatures(insertedCRSObjectId, insertedFeaturesObjectIds);
    console.log("Finsihed associating each feature with its CRS.\n");

    // Send successful response to the client
    sendResponseWithGoBackLink(response, "Server successfully saved geoJSON.");
  }
);

//! Client requests the region borders collection to be deleted
regionBordersRouter.post("/deleteRegionBorders", function (request, response) {
  console.log("Client requested to drop the region borders collection.");

  // Drop database and send response to the server.
  DatabaseEngine.getRegionBordersCollection().drop(function (
    dropError,
    databaseResponse
  ) {
    //* Error handling
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      console.log(
        "Region borders collection doesn't exist in the database (was probably already deleted).\n"
      );
      sendResponseWithGoBackLink(
        response,
        "Region borders collection doesn't exist in the database (was probably already deleted)."
      );
      return dropError;
    } else if (dropError) {
      console.log(dropError);
      response.send(dropError);
      return dropError;
    }

    console.log("Deleted region borders data from the database.\n");

    // Send successful response to the client
    sendResponseWithGoBackLink(
      response,
      "Server successfully deleted region borders from the database."
    );
  });
});

//! Client requests the CRSs collection to be deleted
regionBordersRouter.post("/deleteCRS", function (request, response) {
  console.log("Client requested to drop the CRSs collection.");

  // Drop database and send response to the server.
  DatabaseEngine.getCRScollection().drop(function (
    dropError,
    databaseResponse
  ) {
    //* Error handling
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      console.log(
        "CRSs collection doesn't exist in the database (was probably already deleted).\n"
      );
      sendResponseWithGoBackLink(
        response,
        "CRSs collection doesn't exist in the database (was probably already deleted)."
      );
      return dropError;
    } else if (dropError) {
      console.log(dropError);
      response.send(dropError);
      return dropError;
    }

    console.log("Deleted CRSs from the database.\n");

    // Send successful response to the client
    sendResponseWithGoBackLink(
      response,
      "Server successfully deleted CRSs from the database."
    );
  });
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
      regionBordersCollectionName
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
