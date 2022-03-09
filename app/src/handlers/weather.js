import {
  queryAllRegionBordersFeatures,
  queryCrsCollectionID,
  queryRegionBordersFeatures,
} from "../utils/database.js";
import { DatabaseEngine } from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";


async function saveCurrentDateToCollection(weatherDatesCollection) {
  let currentDate = new Date();
  let databaseResponse = await weatherDatesCollection.insertOne({
    date: currentDate,
  });
  // insertOne returns some unnecessary parameters
  // it also returns an ObjectId("62266b751239b26c92ec8858") accessed with "databaseResponse.insertedId"
  let insertedDateDatabaseID = databaseResponse.insertedId;
  return insertedDateDatabaseID;
}

//* Saves the weather of each region border feature to the weather collection
//* Associate the weathers saved to the date that they were saved, in the weatherDates collection
//* Sends a warning to the user if not all features had their centers calculated
export async function handleSaveWeather(request, response) {
  console.log("Started saving weather of each feature to the database.");

  //* Save the current date to the weatherDates collection
  let weatherDatesCollection = DatabaseEngine.getWeatherDatesCollection();
  let weatherDateDatabaseID = saveCurrentDateToCollection(
    weatherDatesCollection
  );

  //* Query for all the border regions features in the database that have a center field
  // The server requests an API for the weather in the center (center field) of all individual features saved in the region borders collection.
  // The server needs to convert the center coordinates of each feature, from the associated database CRS (crsObjectId) to the latitude/longitude system, before fetching the weather API
  // The server will then save the weather information to the weather collection, and associate it to the corresponding feature id (_id).
  // As such, the geometry and properties of each region don't need to be returned.
  let featuresQuery = { center: { $exists: true } };
  let featuresQueryProjection = { _id: 1, center: 1, crsObjectId: 1 };
  let regionBordersFeaturesWithCenter = await queryRegionBordersFeatures(
    featuresQuery,
    featuresQueryProjection
  );

  for (const feature of regionBordersFeaturesWithCenter) {
    console.log(feature);

    //* Query the database for the CRS associated with the current feature
    let crsCollection = DatabaseEngine.getCRScollection();
    let crsQuery = { _id: feature.crsObjectId };
    // We are going to query the weather API for the weather at the center coordinates of this feature
    // The weather API uses latitude and longitude, so we need the CRS that the database feature was saved with, to convert it2 to latitude/longitude
    let crsQueryProjection = { crs: 1 };

    let currentFeatureCRS = await crsCollection.findOne(
      crsQuery,
      crsQueryProjection
    );

    proj4.defs(projectionName, projectionInformation); // Tells the proj4 library to use the projection information returned from the external API

    //* Request the weather at the center of each feature from an external API
    const url =
      "http://api.weatherapi.com/v1/current.json?key=a1f415612c9543ea80a151844220103&q=" +
      feature.center +
      "&aqi=yes";
    const fetchSettings = { method: "Get" };
    const response = await fetch(url, fetchSettings);
    const weatherDataJSON = await response.json();

    // //* Save the weather of each feature to the weather collection
    // let weatherCollection = DatabaseEngine.getWeatherCollection();
    // let databaseResponse = await weatherCollection.insertOne({
    //   weather: weatherDataJSON,
    //   weatherDate: insertedDateDatabaseID,
    //   regionBorderFeatureObjectId: feature._id,
    // });
    // // insertOne returns some unnecessary parameters
    // // it also returns an ObjectId("62266b751239b26c92ec8858") accessed with "databaseResponse.insertedId"
    // let insertedDateDatabaseID = databaseResponse.insertedId;
  }

  //* Query for features who don't have their center calculated
  let featuresWithNoCenterExist = false;
  let featuresWithNoCenterQuery = { center: { $exists: false } };
  let featuresWithNoCenterQueryProjection = { _id: 1 };
  let regionBordersFeaturesWithNoCenter = await queryRegionBordersFeatures(
    featuresWithNoCenterQuery,
    featuresWithNoCenterQueryProjection
  );

  let message = "Weather information saved to database.";

  //* If all the features had their center calculated, and their weather fetched
  if (regionBordersFeaturesWithNoCenter != []) {
    message =
      message +
      "\nNot all features had their centers calculated beforehand, so their weather couldn't be fetched.\n";
  }
  //* If all the features had their center calculated, and their weather fetched
  else if (regionBordersFeaturesWithNoCenter == []) {
    message =
      message +
      "\nAll features had their centers calculated beforehand, so their weather was fetched.\n";
  }

  console.log(message);
  response.send(message);
}

