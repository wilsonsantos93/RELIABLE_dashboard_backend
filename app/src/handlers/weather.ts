import {queryRegionBordersFeatures} from "../utils/database";
import {DatabaseEngine} from "../configs/mongo";
import sendResponseWithGoBackLink from "../utils/response.js";
import proj4 from "proj4";
import {Request, Response} from "express-serve-static-core";
import {Collection, Document, Filter, FindOptions} from "mongodb";
import {requestWeather} from "../utils/weather";

//* Saves the current date to the weatherDates database
async function saveCurrentDateToCollection(weatherDatesCollection: Collection) {
    let currentDate = new Date();
    let databaseResponse = await weatherDatesCollection.insertOne({
        date: currentDate,
    } as any);
    // insertOne returns some unnecessary parameters
    // it also returns an ObjectId("62266b751239b26c92ec8858") accessed with "databaseResponse.insertedId"
    let insertedDateDatabaseID = databaseResponse.insertedId;
    return insertedDateDatabaseID;
}



// TODO: 3000 weather JSONs take approximately 25 minutes to be fetched from the weather API
// TODO: Doing the fetching in an asynchronous manner would optimize this process
/**
 * Saves the weather of each region border feature to the weather collection. <p>
 * Associate the weathers saved to the date that they were saved, in the weatherDates collection. <p>
 * Sends a warning to the user if not all features had their centers calculated.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleSaveWeather(request: Request, response: Response) {
    console.log("Started saving weather of each feature to the database.");

    //* Save the current date to the weatherDates collection
    let weatherDateDatabaseID = await saveCurrentDateToCollection(
        DatabaseEngine.getWeatherDatesCollection()
    );

    //* Query for all the border regions features in the database
    // The server requests an API for the weather in the FeatureCenter (FeatureCenter field) of all individual features saved in the region borders collection.
    // The server needs to convert the FeatureCenter coordinates of each feature, from the associated database CRS (crsObjectId) to the latitude/longitude system, before fetching the weather API
    // The server will then save the weather information to the weather collection, and associate it to the corresponding feature id (_id).
    // As such, the geometry and properties of each region don't need to be returned.
    let featuresQuery: Filter<Document> = {center: {$exists: true}};
    let featuresQueryProjection = {_id: 1, center: 1, crsObjectId: 1};
    let regionBordersFeaturesWithCenter = await queryRegionBordersFeatures(
        featuresQuery,
        featuresQueryProjection
    );

    let currentFeatureIndex = 1
    for (const currentFeature of regionBordersFeaturesWithCenter) {

        if (currentFeatureIndex % 100 == 0) {
            console.log("Saved weather of feature number:", currentFeatureIndex);
        }

        //* Query the database for the CRS associated with the current feature
        let crsCollection = DatabaseEngine.getCRScollection();
        let crsQuery: Filter<Document> = {_id: currentFeature.crsObjectId};
        // We are going to query the weather API for the weather at the FeatureCenter coordinates of this feature
        // The weather API uses latitude and longitude, so we need the CRS projection information that the database feature was saved with, to convert it to latitude/longitude
        let crsQueryProjection = {_id: 1, crsProjection: 1};
        let crsQueryOptions: FindOptions = {
            projection: crsQueryProjection,
        };

        let currentFeatureCRS = await crsCollection.findOne(
            crsQuery,
            crsQueryOptions
        );

        // Convert the current feature coordinates from its current CRS to latitude/longitude
        let latitudeLongitudeProjection = "+proj=longlat +datum=WGS84 +no_defs"; // Latitude/Longitude projection
        let projectedCoordinates: number[] = proj4(
            currentFeatureCRS.crsProjection,
            latitudeLongitudeProjection,
            currentFeature.center.coordinates
        );

        //* Request the weather at the FeatureCenter of each feature from an external API
        let weatherDataJSON = await requestWeather(projectedCoordinates.reverse())// The database coordinates are saved in [long,lat], the weather API accepts [lat,long]


        // //* Save the weather of each feature to the weather collection
        let weatherCollection = DatabaseEngine.getWeatherCollection();
        let databaseResponse = await weatherCollection.insertOne({
            weatherInformation: weatherDataJSON,
            weatherDateObjectId: weatherDateDatabaseID,
            regionBorderFeatureObjectId: currentFeature._id,
        });

    }

    //* Query for features who don't have their FeatureCenter calculated
    let featuresWithNoCenterQuery = {center: {$exists: false}};
    let featuresWithNoCenterQueryProjection = {_id: 1};
    let regionBordersFeaturesWithNoCenter = await queryRegionBordersFeatures(
        featuresWithNoCenterQuery,
        featuresWithNoCenterQueryProjection
    );

    let message = "Weather information saved to database.";

    //* If not all the features had their FeatureCenter calculated, and didn't have their weather fetched
    if (regionBordersFeaturesWithNoCenter != []) {
        message =
            message +
            "\nNot all features had their centers calculated beforehand, so their weather couldn't be fetched.\n";
    }
    //* If all the features had their FeatureCenter calculated, and their weather fetched
    else if (regionBordersFeaturesWithNoCenter == []) {
        message =
            message +
            "\nAll features had their centers calculated beforehand, so their weather was fetched.\n";
    }

    console.log(message);
    sendResponseWithGoBackLink(response, message);
}



/**
 * Sends a response with a JSON with the various dates the weather was saved in the database
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetWeatherDates(request: Request, response: Response) {
    let weatherDatesQuery = {}; // Query all weather dates to return to the client
    let weatherDatesProjection = {_id: 0, date: 1}; // Only the date itself needs to be returned by the query
    let weatherDatesQueryOptions: FindOptions = {
        projection: weatherDatesProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults = await DatabaseEngine.getWeatherDatesCollection()
        .find(weatherDatesQuery, weatherDatesQueryOptions)
        .toArray();

    response.send(featuresQueryResults)

}
