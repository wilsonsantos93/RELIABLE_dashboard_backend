import {collectionExistsInDatabase, queryFeatureDocuments, queryWeatherDocuments,} from "../utils/database.js";
import {DatabaseEngine} from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";
import {Document, Filter, ObjectId} from "mongodb";
import {Request, Response} from "express-serve-static-core";
import {WeatherProjection} from "../models/DatabaseCollections/Projections/WeatherProjection";
import {FeaturesProjection} from "../models/DatabaseCollections/Projections/FeaturesProjection";
import {FeatureCollection, Polygon} from "geojson";
import {FeatureProperties} from "../models/FeatureProperties";
import async from "async";

/**
 * Sends an array of geoJSONs with the border regions and its weather information on a certain date
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetRegionBordersAndWeatherByDate(request: Request, response: Response) {
    console.log("\nClient requested region borders and weather (Date:" +request.params.weatherDateID +")");

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
        message += "Couldn't get region borders because the collection doesn't exist.\n";
    }

    //* If the weather collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        message += "Couldn't get weather borders because the collection doesn't exist.";
    }

    if (!regionBordersCollectionExists || !weatherCollectionExists) {
        console.log(message);
        //sendResponseWithGoBackLink(response, message);
        return response.status(404).json(message);
    }

    //! End of error handling

    let weatherDateID = request.params.weatherDateID;

    // We are going to use the returning query parameters to add the weather information and associated feature to the current geoJSON
    // As such, the _id, weatherDateObjectId aren't needed
    // We only need the weather field and the regionBorderFeatureObjectId
    let weatherQuery: Filter<Document> = {
        weatherDateObjectId: new ObjectId(weatherDateID),
        "weather.error.code": { $exists: false }
    };
    let weatherQueryProjection: WeatherProjection = {
        _id: 0,
        weatherDateObjectId: 0,
    };

    let weatherDocuments = await queryWeatherDocuments(new ObjectId(weatherDateID), weatherQueryProjection)

    /* let featuresWithWeather = [];
    for (const weatherDocument of weatherDocuments) {
        let featureWithWeather = weatherDocument.feature;
        if (!featureWithWeather.length) continue;
        //featureWithWeather[0].feature.properties.weather = weatherDocument.weather;
        featureWithWeather[0].feature.weather = weatherDocument.weather;
        featuresWithWeather.push(featureWithWeather[0].feature);
        console.log(featuresWithWeather);
    } */

    for (const weatherDocument of weatherDocuments as any) {
        if (!weatherDocument.weather.length) continue;
        weatherDocument.weather = weatherDocument.weather[0].weather;
    }
    
    let geoJsonArrayWithWeather = {
        type: "FeatureCollection",
        features: weatherDocuments //featuresWithWeather
    };

    //response.send(geoJsonArrayWithWeather);
    console.log("Finished sending geoJSONs to the client.\n");
    return response.json(geoJsonArrayWithWeather);
}
