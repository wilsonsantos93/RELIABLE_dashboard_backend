import {DatabaseEngine} from "../configs/mongo.js";
import fetch from "cross-fetch";
import {separateMultiPolygons} from "./regionBorders.js";
import {Db, Document, Filter, FindOptions, ObjectId} from "mongodb";
import {CoordinatesReferenceSystem} from "../interfaces/GeoJSON/CoordinatesReferenceSystem.js";
import {GeoJSON} from "../interfaces/GeoJSON.js";
import {
    CoordinatesReferenceSystemProperties
} from "../interfaces/GeoJSON/CoordinatesReferenceSystem/CoordinatesReferenceSystemProperties.js";
import {RegionBordersDocument} from "../interfaces/DatabaseCollections/RegionBordersDocument";
import {CoordinatesReferenceSystemDocument} from "../interfaces/DatabaseCollections/CoordinatesReferenceSystemDocument";

/**
 * Checks if a collection exists in a database.
 * @param collectionName The collection's name to check.
 * @param database The database to check for the collection name.
 * @return <code>boolean<code>
 * <ul>
 * <li> true - Collection exists in database. </li>
 * <li> false - Collection doesn't in database. </li>
 * <ul>
 */
export async function collectionExistsInDatabase(collectionName: string, database: Db) {
    let collectionExists = false;

    let collectionsInDatabase = await database.listCollections().toArray();

    collectionsInDatabase.forEach(function (collectionInDatabase) {
        if (collectionInDatabase.name === collectionName) {
            collectionExists = true;
        }
    });

    return collectionExists;
}

/**
 * Queries for a {@link CoordinatesReferenceSystem} _id in the <u>coordinatesReferenceSystem</u> collection.
 * @param CRS - The Coordinates Reference System to check the existence.
 * @return The <u>coordinatesReferenceSystem</u> collection _id.
 * @throws {@link Error} - If the Coordinates Reference System doesn't exist in the collection.
 */
export async function queryCrsCollectionID(CRS: CoordinatesReferenceSystem) {

    let crsCollection = DatabaseEngine.getCrsCollection();

    let crsQuery: Filter<Document> = {crs: CRS}; // Query for the database document that has the same crs field as the CRS passed as argument
    // We only want to verify if the CRS passed as argument already exists in the database
    // To do so, we only need a crs document field to be returned by the query, like the _id field
    // If no field is returned we know that the CRS argument doesn't exist in the database
    let crsQueryProjection = {_id: 1};
    let crsQueryOptions: FindOptions = {
        projection: crsQueryProjection,
    };

    let databaseCRS = await crsCollection.findOne(crsQuery, crsQueryOptions);

    //* Returns a CRS database _id given that it exists in the CRS collection
    if (databaseCRS != null) {
        return databaseCRS._id;
    }

    //* Returns null otherwise
    if (databaseCRS == null) {
        throw new Error("Coordinates Reference System doesn't exist in the collection.")
    }
}

/**
 * Fetches and returns the projection information of a {@link CoordinatesReferenceSystem} from an external API.
 * @param crsProperties The {@link CoordinatesReferenceSystem} to fetch the projection information.
 * @return The {@link CoordinatesReferenceSystem} information.
 */
async function fetchProjectionInformation(crsProperties: CoordinatesReferenceSystemProperties) {
    let projectionNumber = crsProperties.name.split("::")[1]; // The number of the EPSG projection, used to fetch the projection information from an external API
    let projectionInformationURL =
        "https://epsg.io/" + projectionNumber + ".proj4"; // The URL of the projection information
    const projectionResponse = await fetch(projectionInformationURL);
    let projectionInformation = await projectionResponse.text();

    return projectionInformation;
}

/**
 * Saves the {@link CoordinatesReferenceSystem} from a {@link geoJSON} to the <u>coordinatesReferenceSystem</u> collection,
 * if it doesn't already exist.
 * @param geoJSON The {@link GeoJSON} to save the CRS.
 * @return {@link ObjectId}
 * <ul>
 * <li> Document already exists in the collection - {@link ObjectId} of the document already in the collection.</li>
 * <li> Document doesn't already exist in the collection - Returns the collection {@link ObjectId} of the crs document inserted.</li>
 * </ul>
 */
export async function saveCoordinatesReferenceSystem(geoJSON: GeoJSON) {

    //* Verify if the crs already exists in the database
    try {
        let crsCollectionID = await queryCrsCollectionID(geoJSON.crs);

        //* If the crs already exists in the database, return its ObjectID
        return crsCollectionID;
    }

    //* If the crs already doesn't already exist in the database, insert it and its projection information, and return its ObjectId.
    catch (exception) {
        let databaseResponse = await DatabaseEngine.getCrsCollection().insertOne({
            crs: geoJSON.crs,
            crsProjection: await fetchProjectionInformation(geoJSON.crs.properties)
        });
        // insertOne returns some unnecessary parameters
        // it also returns an ObjectId("62266b751239b26c92ec8858") accessed with "databaseResponse.insertedId"
        return databaseResponse.insertedId;
    }

}

/**
 * Save each {@link GeoJSON} {@link Feature} to the <u>regionBorders</u> collection individually.
 * @param geoJSON {@link GeoJSON} to insert to the collection.
 * @return Array of with each {@link ObjectId} of the features inserted in the collection.
 */
export async function saveFeatures(geoJSON: GeoJSON) {
    let regionBordersCollection = DatabaseEngine.getRegionBordersCollection();

    let separatedGeoJSON = separateMultiPolygons(geoJSON)  // Separates the geoJSON MultiPolygon features into multiple features

    let insertedFeatureObjectIDs = [];

    // Insert each feature of the geoJSON into the database
    for (const feature of separatedGeoJSON.features) {
        let databaseResponse = await regionBordersCollection.insertOne(
            {feature: feature}
        );
        // insertOne returns some unnecessary parameters
        // it also returns an ObjectId("62266b751239b26c92ec8858") accessed with "databaseResponse.insertedId"
        insertedFeatureObjectIDs.push(databaseResponse.insertedId);
    }

    return insertedFeatureObjectIDs;
}

/**
 * Create a field on each {@link RegionBordersDocument} of the <u>regionBordersCollection</u> with a {@link CoordinatesReferenceSystem} {@link ObjectId}.
 * @param crsObjectId The {@link ObjectId} of the {@link CoordinatesReferenceSystem} to associate.
 * @param featureObjectIds An array containing every {@link ObjectId} of every {@link RegionBordersDocument} to have associated with the {@link crsObjectId}.
 */
export async function associateCRStoFeatures(crsObjectId: ObjectId, featureObjectIds: ObjectId[]) {

    //* For each feature that had its ID passed as parameter, associate a crs ID
    for (const featureObjectId of featureObjectIds) {

        // Update the crs ID of a feature in the database
        await DatabaseEngine.getRegionBordersCollection().updateOne(
            {_id: featureObjectId}, // Updates the feature database document that has the same ObjectId as the current featureObjectId
            {
                $set: {
                    crsObjectId: crsObjectId,
                },
            }
        );

    }
}

/**
 * Query the <u>regionBorders</u> collection for some features border coordinates and properties, and
 * @param featuresQuery The query to make to the region borders collection.
 * @param featuresQueryProjection The fields of the collection {@link RegionBordersDocument} to return in the query.
 * @return  Array containing each {@link RegionBordersDocument} queried.
 */
export async function queryRegionBordersFeatures(featuresQuery: Filter<Document>, featuresQueryProjection: { _id: number; type?: number; properties?: number; geometry?: number; center?: number; crsObjectId?: number; }) {
    featuresQuery.type = "Feature"; // In addition to the query parameters passed as argument, query for various features in the region borders collection
    let featuresQueryOptions: FindOptions = {
        projection: featuresQueryProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults = await DatabaseEngine.getRegionBordersCollection()
        .find(featuresQuery, featuresQueryOptions)
        .toArray() as RegionBordersDocument[];

    return featuresQueryResults;
}

/**
 * Query the region borders collection for all features, and return them in an array.
 * @param queryProjection The fields of the collection {@link RegionBordersDocument} to return in the query.
 * @return Array containing every {@link RegionBordersDocument} in the <u>regionBorders</u> collection.
 * */
export async function queryAllRegionBorderDocuments(queryProjection: { _id: number; properties: number; center: number; crsObjectId: number; }) {
    let featuresQuery: Filter<Document> = {}; // Query for all documents in the region borders collection
    let featuresQueryOptions: FindOptions = {
        projection: queryProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    console.log("Querying region borders collection for all features.");
    let featuresQueryResults = await DatabaseEngine.getRegionBordersCollection()
        .find(featuresQuery, featuresQueryOptions)
        .toArray() as RegionBordersDocument[];
    return featuresQueryResults;
}

/**
 * Query the coordinates reference systems collection for all CRSs, and return them in an array
 * @param queryProjection The fields of the collection {@link CoordinatesReferenceSystem} to return in the query.
 * @return Array containing every {@link {@link CoordinatesReferenceSystem}} in the <u>coordinatesReferenceSystem</u> collection.
 */
export async function queryAllCoordinatesReferenceSystems(queryProjection: { _id: number; crs: number; }) {
    let CRSsQuery: Filter<Document> = {}; // Query for all documents in the coordinates reference systems collection
    let CRSsQueryOptions: FindOptions = {
        projection: queryProjection,
    };

    let CRSsQueryResults = await DatabaseEngine.getCrsCollection()
        .find(CRSsQuery, CRSsQueryOptions)
        .toArray() as CoordinatesReferenceSystemDocument[];

    return CRSsQueryResults;
}