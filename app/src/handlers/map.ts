import {
    collectionExistsInDatabase,
    queryAllCoordinatesReferenceSystems,
    queryRegionBordersFeatures,
} from "../utils/database.js";
import {DatabaseEngine} from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";
import {Document, Filter, FindOptions, ObjectId} from "mongodb";
import {Request, Response} from "express-serve-static-core";
import {GeoJSON} from "../interfaces/GeoJSON/GeoJSON.js";

/**
 * Sends an array of geoJSONs with the border regions and its weather information on a certain date
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetRegionBordersAndWeatherByDate(
    request: Request,
    response: Response
) {
    console.log(
        "Client requested region borders and weather (Date:" +
        request.params.weatherDateID +
        ")"
    );

    let message = "";

    //! Error handling

    //* Check if the region border collection exists
    let regionBordersCollectionExists = await collectionExistsInDatabase(
        DatabaseEngine.getRegionBordersCollectionName(),
        DatabaseEngine.getDashboardDatabase()
    );

    //* Check if the weather collection exists
    let weatherCollectionExists = await collectionExistsInDatabase(
        DatabaseEngine.getWeatherCollectionName(),
        DatabaseEngine.getDashboardDatabase()
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        message +=
            "Couldn't get region borders because the collection doesn't exist.\n";
    }

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
    //* If the region borders collection exists, so does the coordinates reference systems collection
    //* If the weather collection exists, so does the weather data collection
    if (regionBordersCollectionExists && weatherCollectionExists) {
        console.log("Started sending geoJSONs to the client.");
        let geoJSONs: GeoJSON[] = [];

        //* Query the region borders collection for the various CRSs
        //* The _id and the crs of each CRS document, is going to be used to return a geoJSON with the crs, and the associated region border features
        console.log(
            "Started querying coordinates reference systems collection for all CRSs."
        );
        let crsQueryProjection = {_id: 1, crs: 1};
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
            let geoJSON: GeoJSON = {
                type: "FeatureCollection",
                crs: crs,
                features: [],
            };

            // Query for all the features that have the same crsObjectId field as the current CRS _id
            // The features also need to have had their FeatureCenter calculated, otherwise they don't have a weather associated
            let featuresQuery: Filter<Document> = {
                crsObjectId: crs._id,
                center: {$exists: true, $ne: null},
            };
            // We are going to use the returning query parameters to build the geoJSON
            // As such, the feature FeatureCenter coordinates, and crsObjectId aren't needed
            // We only need the type, properties and geometry to build the geoJSONs
            // We need the feature _id to query for the corresponding weathers
            let regionBordersQueryProjection = {
                _id: 1,
                type: 1,
                properties: 1,
                geometry: 1,
            };
            let regionBordersFeaturesArray = await queryRegionBordersFeatures(
                featuresQuery,
                regionBordersQueryProjection
            );

            //* Query for the weather information of each feature in the regionBordersFeaturesArray, at a given date, and save it to the feature
            console.log("Started query for the weather of each feature.");
            for (const currentFeature of regionBordersFeaturesArray) {
                let weatherCollection = DatabaseEngine.getWeatherCollection();
                // EJS is used to dynamically create a button for each date that the regions weather information the were saved
                // Each button makes a POST request to the getRegionBordersAndWeather/:weatherDateID
                let weatherDateID = request.params.weatherDateID; //https://stackoverflow.com/questions/20089582/how-to-get-a-url-parameter-in-express

                let weatherOfCurrentFeatureQuery: Filter<Document> = {
                    weatherDateObjectId: new ObjectId(weatherDateID),
                    regionBorderFeatureObjectId: currentFeature._id,
                }; // Query for the weather that has the same regionBorderFeatureObjectId field as the current feature _id
                // We are going to use the returning query parameters to add the weather information to the current geoJSON
                // As such, the _id, regionBorderFeatureObjectId, weatherDateObjectId aren't needed
                // We only need the weatherInformation.current field
                let weatherOfCurrentFeatureQueryProjection = {
                    _id: 0,
                    weatherDateObjectId: 0,
                    regionBorderFeatureObjectId: 0,
                };
                let weatherOfCurrentFeatureQueryOptions: FindOptions = {
                    projection: weatherOfCurrentFeatureQueryProjection,
                };

                let currentFeatureWeatherDocument = await weatherCollection.findOne(
                    weatherOfCurrentFeatureQuery,
                    weatherOfCurrentFeatureQueryOptions
                );

                //* If the current feature had its weather saved at the given date, add the current feature weather information to the feature, and push the feature to the geoJSON
                if (currentFeatureWeatherDocument != null) {
                    let currentFeatureWeatherInformation = currentFeatureWeatherDocument.weatherInformation;
                    currentFeature.weather = {
                        location: currentFeatureWeatherInformation.location,
                        current: currentFeatureWeatherInformation.current
                    };
                    geoJSON.features.push(currentFeature);
                }

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
