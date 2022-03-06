//! // Appends to a message a HTML link so the browser user can go back a page, and sends it
import sendResponseWithGoBackLink from "../utils/response.js";

//! Express
import express from "express";
export let regionBordersRouter = express.Router();

//! Database engine connection
import { DatabaseEngine } from "../config/mongo.js";

//! Get region borders data route
regionBordersRouter.get(
  "/getRegionBorders",
  async function (request, response) {
    console.log("Client requested region borders.");

    //* Check if the region border collection exists
    let regionBordersCollectionExists =
      await DatabaseEngine.regionBordersCollectionExists();

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
      response.send(
        "Couldn't get region borders because the collection doesn't exist."
      );
    } else if (regionBordersCollectionExists) {
      //* Query the region borders collection for the crs
      let crsQueryResults = await DatabaseEngine.getRegionBordersCRS();
      //* Query the region borders collection for the various features
      let featuresQueryResults =
        await DatabaseEngine.getRegionBordersFeatures();

      //* Parse and send geoJSON
      let geoJSON = {
        type: "FeatureCollection",
        crs: crsQueryResults.crs,
        features: featuresQueryResults,
      };
      console.log("Started sending geoJSON to the client.");
      response.send(geoJSON);
      console.log("Finished sending geoJSON to the client.\n");
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
  function (request, response) {
    //! Parse received file bytes to geoJSON
    console.log("Received geoJSON from the client.");
    let fileBuffer = request.file.buffer; // Multer enables the server to access the file sent by the client using "request.file.buffer". The file accessed is in bytes.
    let trimmedFileBuffer = fileBuffer.toString("utf-8").trimStart().trimEnd(); // Sometimes the geoJSON sent has unnecessary spaces that need to be trimmed
    let geoJSON = JSON.parse(trimmedFileBuffer); // Parse the trimmed file buffer to a correct geoJSON

    //! Save geoJSON to region borders collection and send response to the client
    const regionBordersCollection = DatabaseEngine.getRegionBordersCollection();

    //* Save geoJSON coordinate reference system to the collection
    regionBordersCollection.insertOne(
      { crs: geoJSON.crs },
      function (insertingError, databaseResponse) {
        if (insertingError) {
          response.send(error);
        }
        console.log(
          "Inserted geoJSON coordinate reference system in the database."
        );
      }
    );

    //* Save each geoJSON feature to the collection individually
    regionBordersCollection.insertMany(
      geoJSON.features,
      function (insertingError, databaseResponse) {
        if (insertingError) {
          response.send(error);
        }
        console.log("Inserted geoJSON features in the database.\n");
        // console.log(databaseResponse)

        // Send successful response to the client
        sendResponseWithGoBackLink(
          response,
          "Server successfully saved geoJSON."
        );
      }
    );
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

//! Calculate centers of each feature in the database route
import polygonCenter from "geojson-polygon-center";
regionBordersRouter.get(
  "/calculateCenters",
  async function (request, response) {
    console.log(
      "Client requested to calculate the centers for each region border in the collection."
    );

    //* Check if the region border collection exists
    let regionBordersCollectionExists =
      await DatabaseEngine.regionBordersCollectionExists();

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
      response.send(
        "Can't calculate centers because the region borders collection doesn't exist."
      );
    }

    //* If the region borders collection exists, calculate and update the centers of each feature in the collection
    else if (regionBordersCollectionExists) {
      //* Query the region borders collection for the various features
      let featuresQueryResults =
        await DatabaseEngine.getRegionBordersFeatures();

      for (const feature of featuresQueryResults) {
        // Calculate centre point of the feature
        let center = polygonCenter(feature.geometry);

        // Add the centre data to the feature in the database
        DatabaseEngine.getRegionBordersCollection().updateOne(
          { "properties.Dicofre": feature.properties.Dicofre }, // Updates the database document that has the same properties.Dicofre as the current feature
          {
            $set: {
              center: center,
            },
          }
        );
      }
      response.send(
        "Successfully calculated centers coordinates for each feature in the region borders collection."
      );
    }
  }
);

