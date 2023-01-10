import {queryFeatureDocuments} from "../utils/database.js";
import {DatabaseEngine} from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";
import {Request, Response} from "express-serve-static-core";
import {Document, Filter, FindOptions, ObjectId} from "mongodb";
import {requestWeather} from "../utils/weather.js";
import {FeaturesProjection} from "../models/DatabaseCollections/Projections/FeaturesProjection";
import async from "async";

/**
 * Saves the current date to the <u>weatherDates</u> collection.
 * @return The saved date {@link ObjectId} in the <u>weatherDates</u> collection.
 */
async function saveCurrentDateToCollection() {

    let weatherDatesCollection = DatabaseEngine.getWeatherDatesCollection()

    let currentDate = new Date();
    let databaseResponse = await weatherDatesCollection.insertOne({
        date: currentDate,
    } as any);
    // insertOne returns some unnecessary parameters
    // it also returns an ObjectId("62266b751239b26c92ec8858") accessed with "databaseResponse.insertedId"
    let insertedDateDatabaseID = databaseResponse.insertedId;
    return insertedDateDatabaseID;
}

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
    );

    // The server requests an API for the weather in the FeatureCenter (FeatureCenter field) of all individual features with their center calculated saved in the collection.
    // The server will then save the weather to the weather collection, and associate it to the corresponding feature id (_id).
    // As such, only the _id and the center need to be returned.
    let featuresQuery: Filter<Document> = {center: {$exists: true}};
    let featuresQueryProjection: FeaturesProjection = {_id: 1, center: 1};
    let featureDocumentsWithCenter = await queryFeatureDocuments(
        featuresQuery,
        featuresQueryProjection
    );

    let currentFeatureIndex = 1
    await async.each(featureDocumentsWithCenter,async (currentFeature) => {
        try {if ((currentFeatureIndex % 10) == 0) {
            console.log("Saved weather of feature number:", currentFeatureIndex);
        }

        //* Request the weather at the FeatureCenter of each feature from an external API
        let weatherDataJSON = await requestWeather(currentFeature.center.coordinates.reverse())// The database coordinates are saved in [long,lat], the weather API accepts [lat,long]


        //* Save the weather of each feature to the weather collection
        let weatherCollection = DatabaseEngine.getWeatherCollection();
        await weatherCollection.insertOne({
            weather: weatherDataJSON,
            weatherDateObjectId: weatherDateDatabaseID,
            regionBorderFeatureObjectId: currentFeature._id,
        });

        currentFeatureIndex++;}
        catch (error) {
            console.log("Error while saving weather of feature number:", currentFeatureIndex);
            console.log(error);
        }
    })

    //* Query for features who don't have their FeatureCenter calculated
    let featuresWithNoCenterQuery = {center: {$exists: false}};
    let featuresWithNoCenterQueryProjection = {_id: 1};
    let regionBordersFeaturesWithNoCenter = await queryFeatureDocuments(
        featuresWithNoCenterQuery,
        featuresWithNoCenterQueryProjection
    );

    let message = "Weather information saved to database.";

    //* If not all the features had their FeatureCenter calculated, and didn't have their weather fetched
    /* if (regionBordersFeaturesWithNoCenter != []) { */
    if (regionBordersFeaturesWithNoCenter.length > 0) {
        message =
            message +
            "\nNot all features had their centers calculated beforehand, so their weather couldn't be fetched.\n"
            + regionBordersFeaturesWithNoCenter.toString();

    }
    //* If all the features had their FeatureCenter calculated, and their weather fetched
    else /* if (regionBordersFeaturesWithNoCenter == []) */ {
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

    console.log("\nQuerying for weather dates.")

    let weatherDatesQuery = {}; // Query all weather dates to return to the client
    let weatherDatesProjection = {_id: 1, date: 1}; // Only the date itself needs to be returned by the query
    let weatherDatesQueryOptions: FindOptions = {
        projection: weatherDatesProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults = await DatabaseEngine.getWeatherDatesCollection()
        .find(weatherDatesQuery, weatherDatesQueryOptions)
        .toArray();

    response.send(featuresQueryResults)
    console.log("Finished for weather dates.")

}
