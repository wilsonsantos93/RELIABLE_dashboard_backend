import { DatabaseEngine } from "../configs/mongo.js";

import {
  queryAllCoordinatesReferenceSystems,
  collectionExistsInDatabase,
  getRegionBordersFeatures,
} from "../utils/database.js";

//* Returns an array of geoJSONs
//* Each element of the array is a geoJSON with a different coordinates reference system found in the database
//* Each element of the array consists of a CRS and the region borders projected using that CRS
export async function getRegionBorders() {
  //* Check if the region border collection exists
  let regionBordersCollectionName =
    DatabaseEngine.getRegionBordersCollectionName();
  let regionBordersCollectionExists = await collectionExistsInDatabase(
    regionBordersCollectionName
  );

  //* If the region borders collection doesn't exist, send error response to the client
  if (!regionBordersCollectionExists) {
    response.send(
      "Couldn't get region borders because the collection doesn't exist."
    );
  }

  //* If the region borders collection exists, send it to client
  else if (regionBordersCollectionExists) {
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
      let regionBordersFeaturesArray = await getRegionBordersFeatures(
        regionBordersQuery,
        regionBordersQueryProjection
      );

      // Add the queried features to the geoJSON
      geoJSON.features = regionBordersFeaturesArray;

      // Add the geoJSON to the geoJSONs array
      geoJSONs.push(geoJSON);
    }

    return geoJSONs;
  }
}
