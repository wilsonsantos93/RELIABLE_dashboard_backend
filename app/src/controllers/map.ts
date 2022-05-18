import {collectionExistsInDatabase, queryFeatureDocuments, queryWeatherDocuments,} from "../utils/database.js";
import {DatabaseEngine} from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";
import {Document, Filter, ObjectId} from "mongodb";
import {Request, Response} from "express-serve-static-core";
import {WeatherProjection} from "../models/DatabaseCollections/Projections/WeatherProjection";
import {FeaturesProjection} from "../models/DatabaseCollections/Projections/FeaturesProjection";
import {FeatureCollectionWithCRS} from "../models/FeatureCollectionWithCRS";
import {FeatureCollection, Polygon} from "geojson";
import {FeatureProperties} from "../models/FeatureProperties";

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
        DatabaseEngine.getFeaturesCollectionName(),
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

    let weatherDateID = request.params.weatherDateID; //https://stackoverflow.com/questions/20089582/how-to-get-a-url-parameter-in-express

    // We are going to use the returning query parameters to add the weather information and associated feature to the current geoJSON
    // As such, the _id, weatherDateObjectId aren't needed
    // We only need the weather field and the regionBorderFeatureObjectId
    let weatherQuery: Filter<Document> = {
        weatherDateObjectId: new ObjectId(weatherDateID),
        "weather.error.code": {$exists: false}
    };
    let weatherQueryProjection: WeatherProjection = {
        _id: 0,
        weatherDateObjectId: 0,
    };

    let weatherDocuments = await queryWeatherDocuments(weatherQuery, weatherQueryProjection)

    //* Query for the features associated with the weathers
    let weatherGeoJSON: FeatureCollection<Polygon, FeatureProperties> = {
        type: "FeatureCollection",
        features: []
    }

    for (const weatherDocument of weatherDocuments) {

        let featuresBordersQuery: Filter<Document> = {
            _id: weatherDocument.regionBorderFeatureObjectId
        }

        // The GeoJSON only needs the weather information
        let featuresQueryProjection: FeaturesProjection = {
            _id: 0,
            center: 0
        }

        // Find the weather's associated feature, returned as an array with only one element
        let featureDocument = await queryFeatureDocuments(
            featuresBordersQuery,
            featuresQueryProjection
        );

        featureDocument[0].feature.properties.weather = weatherDocument.weather;
        weatherGeoJSON.features.push(featureDocument[0].feature)

    }

    console.log("Started sending geoJSONs to the client.");
    response.send(weatherGeoJSON);
    console.log("Finished sending geoJSONs to the client.\n");

}
