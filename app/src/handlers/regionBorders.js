import { DatabaseEngine } from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";
import {
  saveCRS,
  saveFeatures,
  associateCRStoFeatures,
  queryAllCoordinatesReferenceSystems,
  collectionExistsInDatabase,
  queryRegionBordersFeatures,
  queryAllRegionBordersFeatures,
} from "../utils/database.js";
import { request, response } from "express";

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
    console.log(
      "Started querying coordinates reference systems collection for all CRSs."
    );
    let crsQueryResults = await queryAllCoordinatesReferenceSystems(
      crsQueryProjection
    );
    console.log(
      "Finished querying coordinates reference systems collection for all CRSs."
    );

    //* Query each CRS in the database for the associated border region features
    console.log(
      "Started query each CRS in the database for the associated border region features."
    );
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
    console.log(
      "Finished query each CRS in the database for the associated border region features."
    );

    console.log("Started sending geoJSONs to the client.");
    response.send(geoJSONs);
    console.log("Finished sending geoJSONs to the client.\n");
  }
}

//* Save a geoJSON information to the database
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
    console.log();
  } catch (error) {
    console.log(error);
    response.send(error);
  }

  //* Save each geoJSON feature to the collection individually
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

//* Client requests for the server to the center coordinates of all the features in the database
import polygonCenter from "geojson-polygon-center";
// import multiPolygon from ""
export async function handleCalculateCenters(request, response) {
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

    let collectionHadMultiPolygonFeatures = false; // Is true if the collection had MultiPolygon features, and its centers couldn't be calculated as a result
    for (const feature of featuresQueryResults) {
      let center;

      // Can't calculate the center of a feature if the geoJSON of that feature has the geometry type of multy polygon
      // TODO: Implement a way to separate the multy polygon feature into multiple features with a polygon type
      if (feature.geometry.type === "MultiPolygon") {
        center = null;
        collectionHadMultiPolygonFeatures = true;
      }

      // Calculate the center
      else if (feature.geometry.type === "Polygon") {
        center = polygonCenter(feature.geometry);
      }

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

    let message = "";
    if (collectionHadMultiPolygonFeatures) {
      message +=
        "Couldn't calculate center coordinates for every feature in the region borders collection (collection had MultiPolygon features).";
      console.log(message);
      sendResponseWithGoBackLink(response, message)
    } else if (!collectionHadMultiPolygonFeatures) {
      message +=
        "Calculated the center coordinates for every feature in the region borders collection (every feature was of the type Polygon and not MultiPolygon).";
      console.log(message);
      sendResponseWithGoBackLink(response, message);
    }

    console.log(
      "Server finished calculating the centers for each region border in the collection."
    );
  }
}
