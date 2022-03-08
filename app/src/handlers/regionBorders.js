import { DatabaseEngine } from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";

import {
  queryAllCoordinatesReferenceSystems,
  collectionExistsInDatabase,
  queryRegionBordersFeatures,
} from "../utils/database.js";

//* Returns an array of geoJSONs
//* Each element of the array is a geoJSON with a different coordinates reference system found in the database
//* Each element of the array consists of a CRS and the region borders projected using that CRS
export async function handleGetRegionBorders(request, response) {
  console.log("Client requested region borders.");

  //* Check if the region border collection exists
  let regionBordersCollectionName =
    DatabaseEngine.getRegionBordersCollectionName();
  let regionBordersCollectionExists = await collectionExistsInDatabase(
    regionBordersCollectionName,
    DatabaseEngine.getDashboardDatabase()
  );

  //* If the region borders collection doesn't exist, send error response to the client
  if (!regionBordersCollectionExists) {
    let message =
      "Couldn't get region borders because the collection doesn't exist.";
    console.log(message);
    sendResponseWithGoBackLink(response, message);
  }

  //* If the region borders collection exists, send the various saved geoJSONs to the client
  else if (regionBordersCollectionExists) {
    console.log("Started sending geoJSONs to the client.");
    let geoJSONs = [];

    //* Query the region borders collection for the crs
    //* The _id and the crs of the each CRS document, is going to be used to return a geoJSON with the crs, and the associated region border features
    let crsQueryProjection = { _id: 1, crs: 1 };
    let crsQueryResults = await queryAllCoordinatesReferenceSystems(
      crsQueryProjection
    );

    //* Query each CRS in the database for the associated border region features
    for (const crs of crsQueryResults) {
      let geoJSON = {
        type: "FeatureCollection",
        crs: crs.crs,
      };

      let regionBordersQuery = { crsObjectId: crs._id }; // Query for all the features that have the the same crsObjectId as the current CRS _id
      // We are going to use the returning query parameters to build the geoJSON
      // As such, the feature _id, center, and crsObjectId
      // We only need the type, properties and geometry
      // The query results are going to be used by the browser to draw the region borders (geometry field), and give each region a name (type field).
      // As such, the center coordinates of each region don't need to be returned.
      let regionBordersQueryProjection = {
        type: 1,
        properties: 1,
        geometry: 1,
      };
      let regionBordersFeaturesArray = await queryRegionBordersFeatures(
        regionBordersQuery,
        regionBordersQueryProjection
      );

      // Add the queried features to the geoJSON
      geoJSON.features = regionBordersFeaturesArray;

      // Add the geoJSON to the geoJSONs array
      geoJSONs.push(geoJSON);
    }

    response.send(geoJSONs);
    console.log("Finished sending geoJSONs to the client.\n");
  }
}

//* Save a geoJSON information to the database
import {
  saveCRS,
  saveFeatures,
  associateCRStoFeatures,
} from "../utils/database.js";
export async function handleSaveRegionBorders(request, response) {
  console.log("Received geoJSON from the client.");

  //* Parse received file bytes to geoJSON
  let fileBuffer = request.file.buffer; // Multer enables the server to access the file sent by the client using "request.file.buffer". The file accessed is in bytes.
  let trimmedFileBuffer = fileBuffer.toString("utf-8").trimStart().trimEnd(); // Sometimes the geoJSON sent has unnecessary spaces that need to be trimmed
  let geoJSON = JSON.parse(trimmedFileBuffer); // Parse the trimmed file buffer to a correct geoJSON

  //* Save geoJSON coordinate reference system to the collection, if it doesn't already exist
  let insertedCRSObjectId;

  try {
    console.log(
      "Started inserting geoJSON coordinate reference system in the database."
    );
    insertedCRSObjectId = await saveCRS(geoJSON);
    console.log(
      "Inserted geoJSON coordinate reference system in the database. CRS ID in database:",
      // To extract the ID string inside the ObjectId, we use ObjectId.toHexString
      insertedCRSObjectId.toHexString() // The ID string of the CRS document that was inserted in the database
    );
  } catch (error) {
    console.log(error);
    response.send(error);
  }

  //* Save each geoJSON feature to the collection individually
  // TODO: Error handling
  console.log("Starting inserting geoJSON features in the database.");
  let insertedFeaturesObjectIds = await saveFeatures(geoJSON);
  console.log("Inserted geoJSON features in the database.\n");

  //* Create a field with on each feature with its associated coordinates reference system
  console.log("Starting associating each feature with its CRS.");
  await associateCRStoFeatures(insertedCRSObjectId, insertedFeaturesObjectIds);
  console.log("Finsihed associating each feature with its CRS.\n");

  // Send successful response to the client
  sendResponseWithGoBackLink(response, "Server successfully saved geoJSON.");
}

//* Deletes the region borders collection from the databaseResponse
export async function handleDeleteRegionBorders(request, response) {
  console.log("Client requested to drop the region borders collection.");

  // Drop database and send response to the server
  try {
    await DatabaseEngine.getRegionBordersCollection().drop();

    let message =
      "Server successfully deleted region borders from the database.";

    console.log(message);
    console.log("\n");

    // Send successful response to the client
    sendResponseWithGoBackLink(response, message);
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      let message =
        "Region borders collection doesn't exist in the database (was probably already deleted).";
      console.log(message);
      console.log("\n");
      sendResponseWithGoBackLink(response, message);
    } else if (dropError) {
      console.log(dropError);
      sendResponseWithGoBackLink(response, dropError);
    }
  }
}

//! Client requests the CRSs collection to be deleted
export async function handleDeleteCRSs(request, response) {
  console.log("Client requested to drop the CRSs collection.");

  // Drop database and send response to the server
  try {
    await DatabaseEngine.getCRScollection().drop();
    let message = "Server successfully deleted CRSs from the database.";
    console.log(message);
    console.log("");

    // Send successful response to the client
    sendResponseWithGoBackLink(response, message);
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      let message =
        "CRSs collection doesn't exist in the database (was probably already deleted).";
      console.log(message);
      console.log("\n");
      sendResponseWithGoBackLink(response, message);
    } else if (dropError) {
      console.log(dropError);
      response.send(dropError);
    }
  }
}
