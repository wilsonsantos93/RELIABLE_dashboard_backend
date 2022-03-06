//! Express
import express from "express";
export let regionBordersRouter = express.Router();

//! Database engine connection
import { DatabaseEngine } from "../config/mongo.js";

//! Middleware
// regionBordersRouter.use(express.urlencoded({extended: true}));
// reginBordersRouter.use(express.json());

//! Get region borders data route
regionBordersRouter.get(
  "/getRegionBorders",
  async function (request, response) {

    console.log("Client requested region borders.")

    const regionBordersDataCollection =
      DatabaseEngine.getRegionBordersCollection();

    //! Query region borders collection for the coordinate reference system
    const crsQuery = { "crs.type": "name" }; // Query for the only document in the region borders collection who has a crs.type
    // Don't include the crs document's ID in the query results
    const crsQueryOptions = {
      projection: { _id: 0, crs: 1 },
    };
    // The following query returns {crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::3763' } } }
    console.log("Querying collection for the coordinate reference system.")
    let crsQueryResults = await regionBordersDataCollection.findOne(
      crsQuery,
      crsQueryOptions
    );

    //! Query region borders collection for the various features
    let featuresQuery = { "type": "Feature" }; // Query for various features in the region borders collection
    // Don't include each document's ID in the query results
    let featuresQueryOptions = {
      projection: { _id: 0, type: 1, geometry: 1, properties: 1 },
    };
    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    console.log("Querying region borders collection for the various features.")
    let featuresQueryResults = await regionBordersDataCollection
      .find(featuresQuery, featuresQueryOptions)
      .toArray();

    //! Parse and send geoJSON
    // let geoJSON = { type: "FeatureCollection", crs: crsQueryResults.crs, features: featuresQueryResults };
    let geoJSON = { type: "FeatureCollection", crs: crsQueryResults.crs, features: featuresQueryResults };
    console.log("Started sending geoJSON to the client.")
    response.send(geoJSON);
    console.log("Finished sending geoJSON to the client.\n")
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
    // console.log(geoJSON)

    //! RoutersSave JSON to database and send response to the client
    const regionBordersCollection = DatabaseEngine.getRegionBordersCollection();

    //! Save geoJSON coordinate reference system to the collection
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

    //! Save geoJSON features to the collection individually
    regionBordersCollection.insertMany(
      geoJSON.features,
      function (insertingError, databaseResponse) {
        if (insertingError) {
          response.send(error);
        }
        console.log("Inserted geoJSON features in the database.");
        // console.log(databaseResponse)

        // Send successful response to the client
        let responseMessage = "";
        responseMessage += "Server successfully saved geoJSON.<br><br>";
        responseMessage +=
          "<a href='javascript:history.back()'>Return to the last page.</a>";
        response.send(responseMessage);
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
        "Region borders collection doesn't exist in the database (was probably already deleted)"
      );
      let responseMessage = "";
      responseMessage +=
        "Region borders collection doesn't exist in the database (was probably already deleted).<br><br>";
      responseMessage +=
        "<a href='javascript:history.back()'>Return to the last page.</a>";
      response.send(responseMessage);
      return dropError;
    } else if (dropError) {
      console.log(dropError);
      response.send(dropError);
      return dropError;
    }

    console.log("Deleted region borders data from the database.");

    // Send successful response to the client
    let responseMessage = "";
    responseMessage +=
      "Server successfully deleted region borders from the database.<br><br>";
    responseMessage +=
      "<a href='javascript:history.back()'>Return to the last page.</a>";
    response.send(responseMessage);
  });
});
