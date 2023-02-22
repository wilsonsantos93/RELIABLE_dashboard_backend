import {collectionExistsInDatabase, queryFeatureDocuments, queryWeatherDocuments,} from "../../utils/database.js";
import {DatabaseEngine} from "../../configs/mongo.js";
import {Document, Filter, ObjectId} from "mongodb";
import {Request, Response} from "express-serve-static-core";
import {WeatherProjection} from "../../models/DatabaseCollections/Projections/WeatherProjection";
import {FeaturesProjection} from "../../models/DatabaseCollections/Projections/FeaturesProjection";
import {FeatureCollection, Polygon} from "geojson";
import {FeatureProperties} from "../../models/FeatureProperties";
import async from "async";
import { BoundingBox } from "../../models/BoundingBox.js";

/**
 * Sends an array of geoJSONs with the border regions and its weather information on a certain date
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetRegionBordersAndWeatherByDate(request: Request, response: Response) {
    //* Check if date or dateId was sent 
    if (!request.query.dateId && !request.query.date) return response.status(500).json("Date is missing.");

    // Transform date id string into ObjectId
    let weatherDateObjectID: ObjectId;
    if (request.query.date) { 
        const datesCollection = DatabaseEngine.getWeatherDatesCollection();
        const dateId: any = await datesCollection.find({ "date": { $lte: new Date(request.query.date as string) } }).sort({"date": -1}).limit(1).toArray();
        if (!dateId.length) return response.status(404).json("Date not found.");
        weatherDateObjectID = dateId[0]._id;
    } else {
        weatherDateObjectID = new ObjectId(request.query.dateId as string);
    }

    console.log(`Client requested region borders and weather (Date: ${weatherDateObjectID})`);

    let message = "";

    //* Check if the region border collection exists
    const regionBordersCollectionExists = await collectionExistsInDatabase(
        DatabaseEngine.getFeaturesCollectionName(),
        DatabaseEngine.getDashboardDatabase()
    );

    //* Check if the weather collection exists
    const weatherCollectionExists = await collectionExistsInDatabase(
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
        return response.status(404).json(message);
    }


    // We are going to use the returning query parameters to add the weather information and associated feature to the current geoJSON
    // As such, the _id, weatherDateObjectId aren't needed
    // We only need the weather field and the regionBorderFeatureObjectId

 /*    let weatherQuery: Filter<Document> = {
        weatherDateObjectId: new ObjectId(weatherDateID),
        "weather.error.code": { $exists: false }
    };
    let weatherQueryProjection: WeatherProjection = {
        _id: 0,
        weatherDateObjectId: 0,
    }; */

    
    // Set coordinates object or null
    let coordinates: BoundingBox = null;
    if (request.query.sw_lng && request.query.sw_lat && request.query.ne_lng && request.query.ne_lat) {
        coordinates = {
            sw_lng: parseFloat(request.query.sw_lng as string),
            sw_lat: parseFloat(request.query.sw_lat as string),
            ne_lng: parseFloat(request.query.ne_lng as string),
            ne_lat: parseFloat(request.query.ne_lat as string)
        }
    }

    // Set flag useCenters
    const useCenters = request.query.hasOwnProperty("useCenters") && request.query.useCenters == "true" ? true : false;

    // Get regions with weather data
    const weatherDocuments = await queryWeatherDocuments(weatherDateObjectID, coordinates, useCenters)

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
        if (!weatherDocument.weather.length) weatherDocument.weather = null;
        weatherDocument.weather = weatherDocument.weather[0].weather;
    }
    
    const geoJsonArrayWithWeather = {
        type: "FeatureCollection",
        features: weatherDocuments //featuresWithWeather
    };

    console.log("Finished sending geoJSONs to the client.");
    return response.json(geoJsonArrayWithWeather);
}
