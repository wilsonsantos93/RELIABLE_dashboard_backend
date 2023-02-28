import { DatabaseEngine } from "../../configs/mongo.js";
import { collectionExistsInDatabase, queryFeatureDocuments, queryAllFeatureDocuments, queryAllCoordinatesReferenceSystems } from "../../utils/database.js";
// @ts-ignore
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";


/**
 * Sends a response with an array of geoJSONs. <p>
 * Each element of the array is a geoJSON with a different coordinates reference system found in the database. <p>
 * Each element of the array consists of a CRS and the region borders projected using that CRS.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 * @returns An array of geoJson documents
 */
export async function handleGetRegionBorders(req: Request, res: Response) {
    try {
        console.log(new Date().toJSON(), "\nClient requested region borders.");

        //* Check if the region border collection exists
        const regionBordersCollectionExists = await collectionExistsInDatabase(
            DatabaseEngine.getFeaturesCollectionName(),
            DatabaseEngine.getDashboardDatabase()
        );

        //* If the region borders collection doesn't exist, send error response to the client
        if (!regionBordersCollectionExists) {
            return res.status(404).json("Couldn't get region borders because the collection doesn't exist.");
        }

        //* If the region borders collection exists, send the various saved geoJSONs to the client
        console.log("Started sending geoJSONs to the client.");
        let geoJSONs = [];

        //* Query the region borders collection for the crs
        //* The _id and the crs of each CRS document, is going to be used to return a geoJSON with the crs, and the associated region border features
        let crsQueryProjection = {_id: 1, crs: 1};
        console.log("Started querying coordinates reference systems collection for all CRSs.");

        let crsQueryResults = await queryAllCoordinatesReferenceSystems(
            crsQueryProjection
        );
        console.log("Finished querying coordinates reference systems collection for all CRSs.");

        //* Query each CRS in the database for the associated border region features
        console.log("Started query each CRS in the database for the associated border region features.");
        for (const crs of crsQueryResults) {
            let geoJSON: any = {
                type: "FeatureCollection",
                crs: crs.crs,
            };

            let regionBordersQuery: any = {crsObjectId: crs._id}; // Query for all the features that have the same crsObjectId as the current CRS _id
            // We are going to use the returning query parameters to build the geoJSON
            // As such, the feature _id, center, and crsObjectId aren't needed
            // We only need the type, properties and geometry
            let regionBordersQueryProjection = {
                _id: 0,
                type: 1,
                properties: 1,
                geometry: 1,
            };

            if (req.params.id) {
                regionBordersQuery._id = new ObjectId(req.params.id as string);
            }
            
            let regionBordersFeaturesArray = await queryFeatureDocuments(
                regionBordersQuery,
                regionBordersQueryProjection
            );

            // Add the queried features to the geoJSON
            geoJSON.features = regionBordersFeaturesArray;

            // Add the geoJSON to the geoJSONs array
            geoJSONs.push(geoJSON);
        }
        console.log("Finished query each CRS in the database for the associated border region features.");

        return res.json(geoJSONs);


        /*let projection: any = {};
        if (req.query.hasOwnProperty("geometry") && (req.query.geometry == '0' || req.query.geometry == 'false')) {
            projection["feature.geometry"] = 0
        }
        if (req.query.hasOwnProperty("center") && (req.query.center == '0' || req.query.center == 'false')) {
            projection["center"] = 0
        }

        let regionBordersDocumentsArray = [];
        if (req.params.id) {
            const find = {
                _id: new ObjectId(req.params.id as string)
            }
            regionBordersDocumentsArray = await queryFeatureDocuments(find, projection);
        }
        else {
            regionBordersDocumentsArray = await queryAllFeatureDocuments(projection);
        }


        const geoJSON = {
            type: "FeatureCollection",
            features: regionBordersDocumentsArray
        } 

        return res.json(geoJSON);*/

    } catch (e) {
        console.error(e);
        return res.status(500).json("Error getting regions");
    }
}

export async function handleGetRegionBorderWithWeather(req: Request, res: Response) {
    try {
        if (!req.params.id) throw "Must specify a region ID";

        let start, end;
        if (req.query.start) {
            start = new Date(req.query.start as string);
            if (isNaN(start.valueOf())) throw "Start date is invalid";
        }
        if (req.query.end){
            end = new Date(req.query.end as string);
            if (isNaN(end.valueOf())) throw "End date is invalid";
        } 

        const weatherCollection = DatabaseEngine.getWeatherCollection();
        const datesCollectionName = DatabaseEngine.getWeatherDatesCollectionName();

        // aggregation pipeline
        let pipeline: any = [];
        pipeline.push({ $match: { regionBorderFeatureObjectId: new ObjectId(req.params.id) }});

        // aggregate with date
        pipeline.push({ 
            $lookup: {
                from: datesCollectionName,
                localField: 'weatherDateObjectId',
                foreignField: '_id',
                as: 'date'
            }
        });

        // add match to lookup if start or date exist
        if (start || end) {
            let matchObj: any = { date: {} };
            if (start) matchObj.date["$gte"] = start;
            if (end) matchObj.date["$lte"] = end;
            pipeline[1]["$lookup"].pipeline = [];
            pipeline[1]["$lookup"].pipeline.push({ $match: { ...matchObj } });
        }

        pipeline.push({ $match: { "date": { "$ne": [] } } });
        pipeline.push({ $project: { "_id":0, "weatherDateObjectId": 0 } });
        
        // run query
        const data = await weatherCollection.aggregate(pipeline).toArray();

        for (const d of data) {
            d.date = d.date[0].date;
        }

        return res.json(data);

    } catch(e) {
        console.error(e);
        return res.status(500).json(e);
    }
}