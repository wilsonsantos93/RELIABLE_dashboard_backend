import {DatabaseEngine} from "../configs/mongo.js";
import sendResponseWithGoBackLink from "../utils/response.js";
import {collectionExistsInDatabase, queryFeatureDocuments, queryAllFeatureDocuments, saveFeatures,} from "../utils/database.js";
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
import {Request, Response} from "express-serve-static-core";
import {FeaturesProjection} from "../models/DatabaseCollections/Projections/FeaturesProjection";
import {Document, Filter} from "mongodb";
import {FeatureCollectionWithCRS} from "../models/FeatureCollectionWithCRS";
import {Feature, FeatureCollection, MultiPolygon, Polygon} from "geojson";
import {FeatureProperties} from "../models/FeatureProperties";

/**
 * Sends a response with an array of geoJSONs. <p>
 * Each element of the array is a geoJSON with a different coordinates reference system found in the database. <p>
 * Each element of the array consists of a CRS and the region borders projected using that CRS.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetRegionBorders(request: Request, response: Response) {
    console.log("Client requested region borders.");

    //* Check if the region border collection exists
    let regionBordersCollectionExists = await collectionExistsInDatabase(
        DatabaseEngine.getFeaturesCollectionName(),
        DatabaseEngine.getDashboardDatabase()
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        let message =
            "Couldn't get region borders because the collection doesn't exist.";
        console.log(message);
        sendResponseWithGoBackLink(response, message);
    }

    //* If the region borders collection exists, send the various saved geoJSONs to the client
    else if (regionBordersCollectionExists) {

        // We are going to use the returning query parameters to build the geoJSON
        // As such, the feature _id, FeatureCenter, and crsObjectId aren't needed
        // We only need the feature
        let regionBordersQueryProjection: FeaturesProjection = {
            _id: 0,
            feature: 1
        };
        let regionBordersDocumentsArray = await queryAllFeatureDocuments(
            regionBordersQueryProjection
        );

        // Add the queried features to the geoJSON
        let queriedFeatures: Feature<Polygon, FeatureProperties>[] = [];
        for (const regionBorderDocument of regionBordersDocumentsArray) {
            queriedFeatures.push(regionBorderDocument.feature)
        }

        let geoJSON: FeatureCollection<Polygon, FeatureProperties> = {
            type: "FeatureCollection",
            features: queriedFeatures
        }

        console.log("Started sending geoJSON to the client.");
        response.send(geoJSON);
        console.log("Finished sending geoJSON to the client.\n");

    }
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
    console.log("Inserted geoJSON features in the database.\n");

    // Send successful response to the client
    sendResponseWithGoBackLink(response, "Server successfully saved geoJSON.");
}

// TODO: Calculate centers and update them with a single query
/**
 * Calculates the FeatureCenter coordinates of every feature in the region borders collection.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleCalculateCenters(request: Request, response: Response) {
    console.log(
        "Client requested to calculate the centers for each region border in the collection."
    );

    //* Check if the region border collection exists
    let regionBordersCollectionName =
        DatabaseEngine.getFeaturesCollectionName();
    let regionBordersCollectionExists = await collectionExistsInDatabase(
        regionBordersCollectionName,
        DatabaseEngine.getDashboardDatabase()
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        response.send(
            "Can't calculate centers because the region borders collection doesn't exist."
        );
    }

    //* If the region borders collection exists, calculate and update the centers of each feature in the collection
    else if (regionBordersCollectionExists) {

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
        for (const currentFeature of featureDocuments) {
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

        }

        let message = "";
        message +=
            "Calculated the center coordinates for every feature in the region borders collection.";
        console.log(message);
        sendResponseWithGoBackLink(response, message);
    }

    console.log(
        "Server finished calculating the centers for each region border in the collection.\n"
    );

}
