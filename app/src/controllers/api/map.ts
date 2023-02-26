import { collectionExistsInDatabase, queryWeatherDocuments } from "../../utils/database.js";
import { DatabaseEngine } from "../../configs/mongo.js";
import { ObjectId } from "mongodb";
import { Request, Response } from "express-serve-static-core";
import { BoundingBox } from "../../types/BoundingBox.js";
import sanitize from "mongo-sanitize";

/**
 * Sends an array of geoJSONs with the border regions and its weather information on a certain date
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetRegionBordersAndWeatherByDate(req: Request, res: Response) {
    //* Check if date or dateId was sent 
    if (!req.query.dateId && !req.query.date) return res.status(500).json("Date is missing.");

    // Transform date id string into ObjectId
    let weatherDateObjectID: ObjectId;
    if (req.query.date) { 
        req.query.date = sanitize(req.query.date);
        const datesCollection = DatabaseEngine.getWeatherDatesCollection();
        const dateId: any = await datesCollection.find({ "date": { $lte: new Date(req.query.date as string) } }).sort({"date": -1}).limit(1).toArray();
        if (!dateId.length) return res.status(404).json("Date not found.");
        weatherDateObjectID = dateId[0]._id;
    } else {
        req.query.dateId = sanitize(req.query.dateId);
        weatherDateObjectID = new ObjectId(req.query.dateId as string);
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
        return res.status(404).json(message);
    }
    
    // Set coordinates object or null
    let coordinates: BoundingBox = null;
    if (req.query.sw_lng && req.query.sw_lat && req.query.ne_lng && req.query.ne_lat) {
        coordinates = {
            sw_lng: parseFloat(sanitize(req.query.sw_lng) as string),
            sw_lat: parseFloat(sanitize(req.query.sw_lat) as string),
            ne_lng: parseFloat(sanitize(req.query.ne_lng) as string),
            ne_lat: parseFloat(sanitize(req.query.ne_lat) as string)
        }
    }

    // Set flag useCenters
    const useCenters = req.query.hasOwnProperty("useCenters") && req.query.useCenters == "true" ? true : false;

    // Get regions with weather data
    const weatherDocuments = await queryWeatherDocuments(weatherDateObjectID, coordinates, useCenters)

    for (const weatherDocument of weatherDocuments as any) {
        if (!weatherDocument.weather.length) weatherDocument.weather = null;
        else weatherDocument.weather = weatherDocument.weather[0].weather;
    }
    
    const geoJsonArrayWithWeather = {
        type: "FeatureCollection",
        features: weatherDocuments
    };

    console.log("Finished sending geoJSONs to the client.");
    return res.json(geoJsonArrayWithWeather);
}
