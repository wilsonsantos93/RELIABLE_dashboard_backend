import {
    collectionExistsInDatabase,
    queryFeatureDocuments, queryWeatherDocuments,
} from "../utils/database.js";
import {DatabaseEngine} from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";
import {Document, Filter, FindOptions, ObjectId} from "mongodb";
import {Request, Response} from "express-serve-static-core";
import {GeoJSON} from "../interfaces/GeoJSON.js";
import {WeatherCollectionDocument} from "../interfaces/DatabaseCollections/WeatherCollectionDocument";
import {WeatherProjection} from "../interfaces/DatabaseCollections/Projections/WeatherProjection";
import {FeaturesProjection} from "../interfaces/DatabaseCollections/Projections/FeaturesProjection";
import {FeatureGeometryPolygon} from "../interfaces/GeoJSON/Feature/FeatureGeometry/FeatureGeometryPolygon";

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

    // TODO: Query for all the weathers saved in the date passed as argument
    let weatherDateID = request.params.weatherDateID; //https://stackoverflow.com/questions/20089582/how-to-get-a-url-parameter-in-express
    let weatherQuery: Filter<Document> = {
        weatherDateObjectId: new ObjectId(weatherDateID),
    };

    // We are going to use the returning query parameters to add the weather information and associated feature to the current geoJSON
    // As such, the _id, weatherDateObjectId aren't needed
    // We only need the weather field and the regionBorderFeatureObjectId
    let weatherQueryProjection: WeatherProjection= {
        _id: 0,
        weatherDateObjectId: 0,
    };

    let weatherDocuments = await queryWeatherDocuments(weatherQuery, weatherQueryProjection)

    //* Query for the features associated with the weathers
    let geoJSON: GeoJSON<FeatureGeometryPolygon> = {
        features: []
    }
    for (const weather of weatherDocuments) {

        let featuresBordersQuery: Filter<Document> = {
            _id: weather.regionBorderFeatureObjectId
        }

        // The GeoJSON only needs the weather information
        let featuresQueryProjection: FeaturesProjection = {
            _id: 0,
            center:0
        }

        let featureDocuments = await queryFeatureDocuments(
            weatherQuery,
            featuresQueryProjection
        );

    }

    console.log("Started sending geoJSONs to the client.");
    response.send(geoJSON);
    console.log("Finished sending geoJSONs to the client.\n");

}
