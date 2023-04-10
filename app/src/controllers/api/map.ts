import { collectionExistsInDatabase, queryAllCoordinatesReferenceSystems, queryFeatureDocuments, queryWeatherDocuments } from "../../utils/database.js";
import { DatabaseEngine } from "../../configs/mongo.js";
import { ObjectId } from "mongodb";
import { Request, Response } from "express-serve-static-core";
import { BoundingBox } from "../../types/BoundingBox.js";
import sanitize from "mongo-sanitize";
import { FeatureCollectionWithCRS } from "../../types/FeatureCollectionWithCRS.js";
import { WeatherCollectionDocument } from "../../types/DatabaseCollections/WeatherCollectionDocument.js";

/**
 * Sends an array of geoJSONs with the border regions and its weather information on a certain date
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */

// Sends an array of geoJSONs with the border regions and its weather information on a certain date
export async function handleGetRegionBordersAndWeatherByDate(req: Request, res: Response) {
    // Check if date or dateId was sent 
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

    //! Error handling

    //* Check if the region border collection exists
    let regionBordersCollectionName = DatabaseEngine.getFeaturesCollectionName();
    let regionBordersCollectionExists = await collectionExistsInDatabase(
        regionBordersCollectionName,
        DatabaseEngine.getDashboardDatabase()
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        message += "Couldn't get region borders because the collection doesn't exist.\n";
    }

    //* Check if the weather collection exists
    let weatherCollectionName = DatabaseEngine.getWeatherCollectionName();
    let weatherCollectionExists = await collectionExistsInDatabase(
        weatherCollectionName,
        DatabaseEngine.getDashboardDatabase()
    );

    //* If the weather collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        message += "Couldn't get weather borders because the collection doesn't exist.";
    }

    if (!regionBordersCollectionExists || !weatherCollectionExists) {
        console.log(message);
        return res.status(404).json(message);
    }

    //! End of error handling

    //* If the region borders collection and the weather collection exists, send the various database geoJSONs to the client
    //* If the region borders collection exists, so does the coordinates reference systems collection
    //* If the weather collection exists, so does the weather data collection
    if (regionBordersCollectionExists && weatherCollectionExists) {
        console.log("Started sending geoJSONs to the client.");
        let geoJSONs: FeatureCollectionWithCRS[] = [];

        //* Query the region borders collection for the various CRSs
        //* The _id and the crs of the CRS document, is going to be used to return a geoJSON with the crs, and the associated region border features
        console.log("Started querying coordinates reference systems collection for all CRSs.");
        let crsQueryProjection = {_id: 1, crs: 1};
        let crsQueryResults = await queryAllCoordinatesReferenceSystems(
            crsQueryProjection
        );
        console.log("Finished querying coordinates reference systems collection for all CRSs.");

        //* Query each CRS in the database for the associated border region features
        console.log( "Started query each CRS in the database for the associated border region features.");
        for (const crs of crsQueryResults) {
            let geoJSON: FeatureCollectionWithCRS = {
                type: "FeatureCollection",
                crs: crs.crs,
                features: [],
            };

            
            //* Query for the weather information of each feature in the regionBordersFeaturesArray, at a given date, and save it to the feature
            console.log("Started query for the weather of each feature.");

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
            const weatherDocuments = await queryWeatherDocuments(req, weatherDateObjectID, crs._id, coordinates, useCenters);

            for (const weatherDocument of weatherDocuments as WeatherCollectionDocument[]) {
                if (!weatherDocument.weather.length) weatherDocument.weather = null;
                else weatherDocument.weather = weatherDocument.weather[0].weather;
            }

            geoJSON.features = weatherDocuments as any;

            //* Add the geoJSON to the geoJSONs array
            geoJSONs.push(geoJSON);
        }
        console.log("Finished query each CRS in the database for the associated border region features.");
        console.log("Started sending geoJSONs to the client.");
        console.log("Finished sending geoJSONs to the client.\n");
        return res.json(geoJSONs);
    }
}