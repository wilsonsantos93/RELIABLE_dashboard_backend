import {DatabaseEngine} from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";
import {collectionExistsInDatabase, queryFeatureDocuments, queryAllFeatureDocuments, saveFeatures,} from "../utils/database.js";
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
import {Request, Response} from "express-serve-static-core";
import {FeaturesProjection} from "../models/DatabaseCollections/Projections/FeaturesProjection";
import {Document, Filter, ObjectId, WithId} from "mongodb";
import {FeatureCollectionWithCRS} from "../models/FeatureCollectionWithCRS";
import {Feature, FeatureCollection, MultiPolygon, Polygon} from "geojson";
import {FeatureProperties} from "../models/FeatureProperties";
import async from "async";

/**
 * Sends a response with an array of geoJSONs. <p>
 * Each element of the array is a geoJSON with a different coordinates reference system found in the database. <p>
 * Each element of the array consists of a CRS and the region borders projected using that CRS.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetRegionBorders(request: Request, response: Response) {
    console.log("\nClient requested region borders.");

    //* Check if the region border collection exists
    const regionBordersCollectionExists = await collectionExistsInDatabase(
        DatabaseEngine.getFeaturesCollectionName(),
        DatabaseEngine.getDashboardDatabase()
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        let message = "Couldn't get region borders because the collection doesn't exist.";
        return response.status(404).json(message)
    }

    //* If the region borders collection exists, send the various saved geoJSONs to the client
    let projection: any = {};
    if (request.query.hasOwnProperty("geometry") && (request.query.geometry == '0' || request.query.geometry == 'false')) {
        projection["feature.geometry"] = 0
    }
    if (request.query.hasOwnProperty("center") && (request.query.center == '0' || request.query.center == 'false')) {
        projection["feature.center"] = 0
    }

    let recordsTotal = 0;
    let recordsFiltered = 0;
    let regionBordersDocumentsArray = [];
    if (request.query.id) {
        const find = {
            _id: new ObjectId(request.query.id as string)
        }
        regionBordersDocumentsArray = await queryFeatureDocuments(find, projection);
    }
    else if (request.query.dt && request.query.columns) {
        projection["center.type"] = 0;
        projection["feature.type"] = 0;

        const find:any = {};
        for (const col of request.query.columns as any[]) {
            if (!col.search.value || col.search.value == '') continue;
            if (col.name == "_id" && ObjectId.isValid(col.search.value)) find[col.name] = new ObjectId(col.search.value);
            else find[col.name] = col.search.value;
        }

        let skip = parseInt(request.query.start as string) || 0;
        let limit = parseInt(request.query.length as string) || 0;

        recordsTotal = await DatabaseEngine.getFeaturesCollection().countDocuments();
        recordsFiltered = (await queryFeatureDocuments(find, projection)).length;

        regionBordersDocumentsArray = await queryFeatureDocuments(find, projection, skip, limit);
    }
    else {
        regionBordersDocumentsArray = await queryAllFeatureDocuments(projection);
    }

    // Add the queried features to the geoJSON
    /* let queriedFeatures = [];
    for (const regionBorderDocument of regionBordersDocumentsArray) {
        queriedFeatures.push(regionBorderDocument)
    } */

    let geoJSON:any = {
        type: "FeatureCollection",
        features: regionBordersDocumentsArray //queriedFeatures
    }

    if (request.query.dt) {
        geoJSON = { 
            data: regionBordersDocumentsArray, //queriedFeatures
            draw: request.query.draw, 
            recordsTotal: recordsTotal,
            recordsFiltered: recordsFiltered
        }
    } 

    return response.json(geoJSON);
    
}


// TODO: Important. User saves empty geoJSON. Crashes program.
/**
 * Save a geoJSON information to the database.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleSaveFeatures(request: Request, response: Response) {
    console.log("Received geoJSON from the client.");

    //* Parse received file bytes to geoJSON
    let fileBuffer = request.file.buffer; // Multer enables the server to access the file sent by the client using "request.file.buffer". The file accessed is in bytes.
    let trimmedFileBuffer = fileBuffer.toString().trimStart().trimEnd(); // Sometimes the geoJSON sent has unnecessary spaces that need to be trimmed
    let geoJSON: FeatureCollectionWithCRS<MultiPolygon | Polygon, FeatureProperties> = JSON.parse(trimmedFileBuffer); // Parse the trimmed file buffer to a correct geoJSON

    //* Save each geoJSON feature to the collection individually
    console.log("Started inserting geoJSON features in the database.");
    await saveFeatures(geoJSON);
    console.log("Inserted geoJSON features in the database.");

    // Send successful response to the client
    request.flash("success_message", "Server successfully saved geoJSON.");
    return response.redirect("/admin");
}


// TODO: Calculate centers and update them with a single query
/**
 * Calculates the FeatureCenter coordinates of every feature in the region borders collection.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleCalculateCenters(request: Request, response: Response) {
    console.log("\nClient requested to calculate the centers for each region border in the collection.");

    //* Check if the region border collection exists
    let regionBordersCollectionName = DatabaseEngine.getFeaturesCollectionName();
    let regionBordersCollectionExists = await collectionExistsInDatabase(
        regionBordersCollectionName,
        DatabaseEngine.getDashboardDatabase()
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        request.flash("error", "Can't calculate centers because the region borders collection doesn't exist.");
    }

    //* If the region borders collection exists, calculate and update the centers of each feature in the collection
    else {

        //* Query the region borders collection for the various features
        // The query results are going to be used by server to calculate the FeatureCenter of each and all features (geometry field), and save it to the corresponding feature (using the id).
        // As such, the properties don't need to be returned, and the FeatureCenter coordinates of each region don't need to be returned (because they shouldn't exist yet).
        let featuresQuery: Filter<Document> = {center: {$exists: false}};
        let featuresQueryProjection = {
            _id: 1,
            properties: 0,
            center: 0,
            crsObjectId: 0,
        };
        let featureDocuments = await queryFeatureDocuments(
            featuresQuery,
            featuresQueryProjection
        );

        let currentFeatureIndex = 1;
        await async.each(featureDocuments, async (currentFeature) => {
            if ((currentFeatureIndex % 10) === 0) {
                console.log("Calculating center of feature number: " + currentFeatureIndex)
            }

            let center = polygonCenter(currentFeature.feature.geometry);

            // Add the centre data to the regionBorderDocument in the database
            await DatabaseEngine.getFeaturesCollection().updateOne(
                {_id: currentFeature._id}, // Updates the region regionBorderDocument document that has the same id as the current regionBorderDocument
                {
                    $set: {
                        center: center,
                    },
                }
            );

            currentFeatureIndex++;
        })

        let message = "";
        message += "Calculated the center coordinates for every feature in the region borders collection.";
        console.log(message);

        request.flash("success_message", message);
    }

    console.log("Server finished calculating the centers for each region border in the collection.\n");
    return response.redirect("/admin");
}


export async function handleGetRegionBordersFields(request: Request, response: Response) {

    function flattenObject(obj: WithId<Document>, prefix = '') {
        return Object.keys(obj).reduce((acc:any, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && k != "_id") Object.assign(acc, flattenObject(obj[k], pre + k));
            else acc[pre + k] = obj[k];
            return acc;
        }, {});
    }

    const projection = { _id: 1, "feature.type": 0, "feature.geometry": 0, "center.type": 0 };
    const data = await DatabaseEngine.getFeaturesCollection().find({}, { projection }).toArray();
    //const columnNames = [...new Set(data.map(item => Object.keys(flattenObject(item)) ).flat())];

    let columnNames: any = [];
    for (const region of data) {
        const keys = Object.keys(flattenObject(region))
        for (const k of keys) {
            if (!columnNames.includes(k)) columnNames.push(k);
        }
    }

    return response.json(columnNames);
}