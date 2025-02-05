import { queryFeatureDocuments } from "../../utils/database.js";
import { DatabaseEngine } from "../../configs/mongo.js";
import sendResponseWithGoBackLink from "../../utils/response.js";
import { createBulkOps, generateAlerts, requestWeather, transformData } from "../../utils/weather.js";
import async from "async";
/**
 * Saves the current date to the <u>weatherDates</u> collection.
 * @return The saved date {@link ObjectId} in the <u>weatherDates</u> collection.
 */
async function saveCurrentDateToCollection() {
    let weatherDatesCollection = DatabaseEngine.getWeatherDatesCollection();
    let currentDate = new Date();
    let databaseResponse = await weatherDatesCollection.insertOne({
        date: currentDate,
    });
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
export async function handleFetchWeather(req, res) {
    //console.log("Started saving weather of each feature to the database.");
    //* Save the current date to the weatherDates collection
    let weatherDateDatabaseID = await saveCurrentDateToCollection();
    // The server requests an API for the weather in the FeatureCenter (FeatureCenter field) of all individual features with their center calculated saved in the collection.
    // The server will then save the weather to the weather collection, and associate it to the corresponding feature id (_id).
    // As such, only the _id and the center need to be returned.
    let featuresQuery = { center: { $exists: true } };
    let featuresQueryProjection = { _id: 1, center: 1 };
    let featureDocumentsWithCenter = await queryFeatureDocuments(featuresQuery, featuresQueryProjection);
    let currentFeatureIndex = 1;
    await async.each(featureDocumentsWithCenter, async (currentFeature) => {
        try {
            /* if ((currentFeatureIndex % 10) == 0) {
                console.log("Saved weather of feature number:", currentFeatureIndex);
            } */
            //* Request the weather at the FeatureCenter of each feature from an external API
            let weatherDataJSON = await requestWeather(currentFeature.center.coordinates.reverse()); // The database coordinates are saved in [long,lat], the weather API accepts [lat,long]
            //* Save the weather of each feature to the weather collection
            let weatherCollection = DatabaseEngine.getWeatherCollection();
            await weatherCollection.insertOne({
                weather: weatherDataJSON,
                weatherDateObjectId: weatherDateDatabaseID,
                regionBorderFeatureObjectId: currentFeature._id,
            });
            currentFeatureIndex++;
        }
        catch (error) {
            //console.log("Error while saving weather of feature number:", currentFeatureIndex);
            console.error(new Date().toJSON(), error);
        }
    });
    //* Query for features who don't have their FeatureCenter calculated
    let featuresWithNoCenterQuery = { center: { $exists: false } };
    let featuresWithNoCenterQueryProjection = { _id: 1 };
    let regionBordersFeaturesWithNoCenter = await queryFeatureDocuments(featuresWithNoCenterQuery, featuresWithNoCenterQueryProjection);
    let message = "Weather information saved to database.";
    //* If not all the features had their FeatureCenter calculated, and didn't have their weather fetched
    /* if (regionBordersFeaturesWithNoCenter != []) { */
    if (regionBordersFeaturesWithNoCenter.length > 0) {
        message = message +
            "\nNot all features had their centers calculated beforehand, so their weather couldn't be fetched.\n"
            + regionBordersFeaturesWithNoCenter.toString();
    }
    //* If all the features had their FeatureCenter calculated, and their weather fetched
    else /* if (regionBordersFeaturesWithNoCenter == []) */ {
        message = message + "\nAll features had their centers calculated beforehand, so their weather was fetched.\n";
    }
    //console.log(message);
    sendResponseWithGoBackLink(res, message);
}
/**
 * Sends a response with a JSON with the various dates the weather was saved in the database
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetWeatherDates(req, res) {
    //console.log("\nQuerying for weather dates.");
    const weatherDatesQuery = {}; // Query all weather dates to return to the client
    const weatherDatesProjection = { _id: 1, date: 1, format: 1 }; // Only the date itself needs to be returned by the query
    const weatherDatesQueryOptions = {
        projection: weatherDatesProjection,
    };
    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    const featuresQueryResults = await DatabaseEngine.getWeatherDatesCollection()
        .find(weatherDatesQuery, weatherDatesQueryOptions)
        .sort({ date: 1 })
        .toArray();
    //console.log("Finished for weather dates.");
    res.json(featuresQueryResults);
}
/**
 * Sends a response with a JSON with the various dates the weather was saved in the database
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleSaveWeather(req, res) {
    // Transform to Array if not Array
    let data = [];
    if (Array.isArray(req.body)) {
        data = [...req.body];
    }
    else {
        data.push(req.body);
    }
    if (!data.length)
        return res.status(500).json("Empty data.");
    //console.log("Transforming data", data)
    // Write data in weather collection
    try {
        const weatherCollection = await DatabaseEngine.getWeatherCollection();
        const result = await weatherCollection.bulkWrite(createBulkOps(await transformData(data)));
        return res.json(result);
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function handleGetWeatherMetadata(req, res) {
    try {
        let find = {};
        const projection = { authRequired: 0 };
        // if not logged in, filter fields
        if (!req.user) {
            find = { authRequired: false, active: true };
        }
        const data = await DatabaseEngine.getWeatherMetadataCollection().find(find, { projection }).toArray();
        return res.json(data);
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function handleGetAlerts(req, res) {
    if (!req.query.lat || !req.query.lng)
        return res.status(500).json("Must specify lat and lng");
    try {
        const locations = [{ lat: parseFloat(req.query.lat), lng: parseFloat(req.query.lng) }];
        const alerts = await generateAlerts(locations);
        return res.json(alerts);
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
//# sourceMappingURL=weather.js.map