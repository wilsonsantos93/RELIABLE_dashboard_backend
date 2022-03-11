import {
  collectionExistsInDatabase,
  queryRegionBordersFeatures,
} from "../utils/database.js";
import { DatabaseEngine } from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";

// Sends an array of geoJSONs with the border regions and its weather information on a certain date
export async function handleGetRegionBordersAndWeatherByDate(
  request,
  response
) {
  console.log("Client requested region borders and weather (Date:" + request.params.weatherDateID + ")");

  let message = "";

  //! Error handling

  //* Check if the region border collection exists
  let regionBordersCollectionName =
    DatabaseEngine.getRegionBordersCollectionName();
  let regionBordersCollectionExists = await collectionExistsInDatabase(
    regionBordersCollectionName,
    DatabaseEngine.getDashboardDatabase()
  );

  //* If the region borders collection doesn't exist, send error response to the client
  if (!regionBordersCollectionExists) {
    message +=
      "Couldn't get region borders because the collection doesn't exist.\n";
  }

  //* Check if the weather collection exists
  let weatherCollectionName = DatabaseEngine.getWeatherCollectionName();
  let weatherCollectionExists = await collectionExistsInDatabase(
    weatherCollectionName,
    DatabaseEngine.getDashboardDatabase()
  );

  //* If the weather collection doesn't exist, send error response to the client
  if (!regionBordersCollectionExists) {
    message +=
      "Couldn't get weather borders because the collection doesn't exist.";
  }

  if (!regionBordersCollectionExists || !weatherCollectionExists) {
    console.log(message);
    sendResponseWithGoBackLink(response, message);
  }

  //! End of error handling

  //* If the region borders collection and the weather collection exists, send the various database geoJSONs to the client
  if (regionBordersCollectionExists && weatherCollectionExists) {
    console.log("Started sending geoJSONs to the client.");
    let geoJSONs = [];

    //* Query the region borders collection for the various CRSs
    //* The _id and the crs of the each CRS document, is going to be used to return a geoJSON with the crs, and the associated region border features
    console.log(
      "Started querying coordinates reference systems collection for all CRSs."
    );
    let crsQueryProjection = { _id: 1, crs: 1 };
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

      let regionBordersQuery = { crsObjectId: crs._id }; // Query for all the features that have the the same crsObjectId field as the current CRS _id
      // We are going to use the returning query parameters to build the geoJSON
      // As such, the feature center coordinates, and crsObjectId aren't needed
      // We only need the type, properties and geometry to build the geoJSONs
      // We need the feature _id to query for the corresponding weathers
      let regionBordersQueryProjection = {
        _id: 1,
        type: 1,
        properties: 1,
        geometry: 1,
      };
      let regionBordersFeaturesArray = await queryRegionBordersFeatures(
        regionBordersQuery,
        regionBordersQueryProjection
      );

      //* Add the queried features to the geoJSON
      geoJSON.features = regionBordersFeaturesArray;

      //* Query for the weather information of each feature, at a given date
      console.log("Started query for the weather of each feature.");
      for (const feature in regionBordersFeaturesArray) {
        let weatherCollection = DatabaseEngine.getWeatherCollection();
        let weatherDateID = request.params.weatherDateID; //https://stackoverflow.com/questions/20089582/how-to-get-a-url-parameter-in-express

        let weatherOfCurrentFeatureQuery = {
          _id: weatherDateID,
          regionBorderFeatureObjectId: feature._id,
        }; // Query for the weather that has the same regionBorderFeatureObjectId field as the current feature _id
        // We are going to use the returning query parameters to add the weather information to the current geoJSON
        // As such, the _id, regionBorderFeatureObjectId, weatherDateObjecId aren't needed
        // We only need the weather field
        let weatherOfCurrentFeatureQueryProjection = {
          weather: 1,
        };
        let currentFeatureWeatherInformation = await weatherCollection.findOne(
          weatherOfCurrentFeatureQuery,
          weatherOfCurrentFeatureQueryProjection
        );

        //* Add the current feature weather information to the geoJSON
        geoJSON.properties.weather = currentFeatureWeatherInformation;
      }

      //* Add the geoJSON to the geoJSONs array
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
