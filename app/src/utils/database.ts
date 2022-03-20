import {DatabaseEngine} from "../configs/mongo";
import fetch from "cross-fetch";
import {separateMultiPolygons} from "./regionBorders.js";
import {Collection, Db, Document, Filter, FindOptions, ObjectId} from "mongodb";
import {CoordinatesReferenceSystem} from "../interfaces/GeoJSON/CoordinatesReferenceSystem";
import {GeoJSON} from "../interfaces/GeoJSON/GeoJSON";
import {
    CoordinatesReferenceSystemProperties
} from "../interfaces/GeoJSON/CoordinatesReferenceSystem/CoordinatesReferenceSystemProperties";
import {Feature} from "../interfaces/GeoJSON/Feature/Feature";


/**
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
 * Queries for a CRS database _id in a collection.
 * @param CRS - The Coordinates Reference System to check the existence.
 * @param crsCollection - The collection to check in.
 * @return The Coordinates Reference System collection _id.
 * @throws {@link Error} - If the Coordinates Reference System doesn't exist in the collection.
 */
export async function queryCrsCollectionID(CRS: CoordinatesReferenceSystem, crsCollection: Collection) {
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

//* Fetch the projection information of the feature associated CRS, and return it
async function fetchProjectionInformation(crsProperties: CoordinatesReferenceSystemProperties) {
    let projectionNumber = crsProperties.name.split("::")[1]; // The number of the EPSG projection, used to fetch the projection information from an external API
    let projectionInformationURL =
        "https://epsg.io/" + projectionNumber + ".proj4"; // The URL of the projection information
    const projectionResponse = await fetch(projectionInformationURL);
    let projectionInformation = await projectionResponse.text();

    return projectionInformation;
}

//* Save a coordinates reference system found on a geoJSON to the database
//* Returns the database ObjectId of the crs document inserted
//* If the crs already exists in the database, return its ObjectId
export async function saveCRS(geoJSON: GeoJSON) {
    let crsCollection = DatabaseEngine.getCRScollection();

    // Verify if the crs already exists in the database
    try {
        let crsCollectionID = await queryCrsCollectionID(geoJSON.crs, crsCollection);

        //* If the crs already exists in the database, return its ObjectID
        return crsCollectionID;
    }

    //* If the crs already doesn't already exist in the database, insert it and its projection information, and return its ObjectID.
    catch (exception) {
        let databaseResponse = await crsCollection.insertOne({
            crs: geoJSON.crs,
            crsProjection: await fetchProjectionInformation(geoJSON.crs.properties)
        });
        // insertOne returns some unnecessary parameters
        // it also returns an ObjectId("62266b751239b26c92ec8858") accessed with "databaseResponse.insertedId"
        return databaseResponse.insertedId;
    }

}

//* Save each geoJSON feature to the collection individually
//* Returns an array of the database ObjectIds of the features inserted
export async function saveFeatures(geoJSON: GeoJSON) {
    let regionBordersCollection = DatabaseEngine.getRegionBordersCollection();

    let separatedGeoJSON = separateMultiPolygons(geoJSON)  // Separates the geoJSON MultiPolygon features into multiple features

    let databaseResponse = await regionBordersCollection.insertMany(
        separatedGeoJSON.features
    );
    // insertMany returns some unnecessary parameters
    // it also returns {'0': new ObjectId("62266ee5a6f882dc9e143bfa"), '1': new ObjectId("62266ee5a6f882dc9e143bfb"), ...}
    // This JSON with the various ObjectIDs can be accessed with databaseResponse.insertedIds
    // To convert the returned JSON to an array with only the ObjectIDs, we use Object.values(databaseResponse.insertedIds)
    let ObjectIdsArray = Object.values(databaseResponse.insertedIds);

    return ObjectIdsArray;
}

//* Create a field on each feature with its associated coordinates reference system
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

//* Query the region borders collection for some features border coordinates and properties, and return them in an array
export async function queryRegionBordersFeatures(featuresQuery: Filter<Document>, featuresQueryProjection: { _id: number; type?: number; properties?: number; geometry?: number; center?: number; crsObjectId?: number; }) {
    featuresQuery.type = "Feature"; // In addition to the query parameters passed as argument, query for various features in the region borders collection
    let featuresQueryOptions: FindOptions = {
        projection: featuresQueryProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults: Feature[] = await DatabaseEngine.getRegionBordersCollection()
        .find(featuresQuery, featuresQueryOptions)
        .toArray();

    return featuresQueryResults;
}

//* Query the region borders collection for all features, and return them in an array
export async function queryAllRegionBordersFeatures(queryProjection: { _id: number; properties: number; center: number; crsObjectId: number; }) {
    let featuresQuery: Filter<Document> = {}; // Query for all documents in the region borders collection
    let featuresQueryOptions: FindOptions = {
        projection: queryProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    console.log("Querying region borders collection for all features.");
    let featuresQueryResults = await DatabaseEngine.getRegionBordersCollection()
        .find(featuresQuery, featuresQueryOptions)
        .toArray();
    return featuresQueryResults;
}

//* Query the coordinates reference systems collection for all CRSs, and return them in an array
export async function queryAllCoordinatesReferenceSystems(queryProjection: { _id: number; crs: number; }) {
    let CRSsQuery: Filter<Document> = {}; // Query for all documents in the coordinates reference systems collection
    let CRSsQueryOptions: FindOptions = {
        projection: queryProjection,
    };

    let CRSsQueryResults = await DatabaseEngine.getCRScollection()
        .find(CRSsQuery, CRSsQueryOptions)
        .toArray();

    return CRSsQueryResults;
}