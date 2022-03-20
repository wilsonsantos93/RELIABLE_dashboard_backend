import {DatabaseEngine} from "../configs/mongo";
import sendResponseWithGoBackLink from "../utils/response.js";
import {
    associateCRStoFeatures,
    collectionExistsInDatabase,
    queryAllCoordinatesReferenceSystems,
    queryAllRegionBordersFeatures,
    queryRegionBordersFeatures,
    saveCRS,
    saveFeatures,
} from "../utils/database";
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
import {Request, Response} from "express-serve-static-core";
import {GeoJSON} from "../interfaces/GeoJSON/GeoJSON";


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
        DatabaseEngine.getRegionBordersCollectionName(),
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
        console.log("Started sending geoJSONs to the client.");
        let geoJSONs: GeoJSON[] = [];

        //* Query the region borders collection for the crs
        //* The _id and the crs of each CRS document, is going to be used to return a geoJSON with the crs, and the associated region border features
        let crsQueryProjection = {_id: 1, crs: 1};
        console.log(
            "Started querying coordinates reference systems collection for all CRSs."
        );
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

            let regionBordersQuery = {crsObjectId: crs._id}; // Query for all the features that have the same crsObjectId as the current CRS _id
            // We are going to use the returning query parameters to build the geoJSON
            // As such, the feature _id, FeatureCenter, and crsObjectId aren't needed
            // We only need the type, properties and geometry
            let regionBordersQueryProjection = {
                _id: 0,
                type: 1,
                properties: 1,
                geometry: 1,
            };
            let regionBordersFeaturesArray = await queryRegionBordersFeatures(
                regionBordersQuery,
                regionBordersQueryProjection
            );

            // Add the queried features to the geoJSON
            let geoJSON: GeoJSON = {
                features: regionBordersFeaturesArray
            };

            // Add the geoJSON to the geoJSONs array
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

// TODO: Important. User saves empty geoJSON. Crashes program.
/**
 * Save a geoJSON information to the database.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleSaveRegionBorders(request: Request, response: Response) {
    console.log("Received geoJSON from the client.");

    //* Parse received file bytes to geoJSON
    let fileBuffer = request.file.buffer; // Multer enables the server to access the file sent by the client using "request.file.buffer". The file accessed is in bytes.
    let trimmedFileBuffer = fileBuffer.toString().trimStart().trimEnd(); // Sometimes the geoJSON sent has unnecessary spaces that need to be trimmed
    let geoJSON = JSON.parse(trimmedFileBuffer); // Parse the trimmed file buffer to a correct geoJSON

    //* Save geoJSON coordinate reference system to the collection, if it doesn't already exist
    let insertedCRSObjectId;

    try {
        console.log(
            "Started inserting geoJSON coordinate reference system in the database."
        );
        insertedCRSObjectId = await saveCRS(geoJSON);
        console.log(
            "Inserted geoJSON coordinate reference system in the database. CRS ID in database:",
            // To extract the ID string inside the ObjectId, we use ObjectId.toHexString
            insertedCRSObjectId.toHexString() // The ID string of the CRS document that was inserted in the database
        );
        console.log();
    } catch (error) {
        console.log(error);
        response.send(error);
    }

    //* Save each geoJSON feature to the collection individually
    console.log("Starting inserting geoJSON features in the database.");
    let insertedFeaturesObjectIds = await saveFeatures(geoJSON);
    console.log("Inserted geoJSON features in the database.");

    //* Create a field with on each feature with its associated coordinates reference system
    console.log("Starting associating each feature with its CRS.");
    await associateCRStoFeatures(insertedCRSObjectId, insertedFeaturesObjectIds);
    console.log("Finished associating each feature with its CRS.\n");

    // Send successful response to the client
    sendResponseWithGoBackLink(response, "Server successfully saved geoJSON.");
}

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
        DatabaseEngine.getRegionBordersCollectionName();
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
        let featuresQueryProjection = {
            _id: 1,
            properties: 0,
            center: 0,
            crsObjectId: 0,
        };
        let featuresQueryResults = await queryAllRegionBordersFeatures(
            featuresQueryProjection
        );


        for (const feature of featuresQueryResults) {

            let center = polygonCenter(feature.geometry);

            // Add the centre data to the feature in the database
            await DatabaseEngine.getRegionBordersCollection().updateOne(
                {_id: feature._id}, // Updates the region feature document that has the same id as the current feature
                {
                    $set: {
                        center: center,
                    },
                }
            );
        }

        let message = "";
        message +=
            "Calculated the FeatureCenter coordinates for every feature in the region borders collection.";
        console.log(message);
        sendResponseWithGoBackLink(response, message);
    }

    console.log(
        "Server finished calculating the centers for each region border in the collection.\n"
    );

}


