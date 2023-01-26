import {DatabaseEngine} from "../configs/mongo.js";
import {convertFeatureCoordinatesToLatLong, requestProjectionInformation, separateMultiPolygons} from "./features.js";
import {Db, Document, Filter, FindOptions, ObjectId} from "mongodb";
import {FeatureDocument} from "../models/DatabaseCollections/FeatureDocument";
import {
    WeatherCollectionDocument,
    WeatherCollectionDocumentWithFeature
} from "../models/DatabaseCollections/WeatherCollectionDocument";
import {WeatherProjection} from "../models/DatabaseCollections/Projections/WeatherProjection";
import {FeaturesProjection} from "../models/DatabaseCollections/Projections/FeaturesProjection";
import {Feature, MultiPolygon, Polygon} from "geojson";
import {FeatureProperties} from "../models/FeatureProperties";
import {FeatureCollectionWithCRS} from "../models/FeatureCollectionWithCRS";

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
 * Save each {@link \"GeoJSON\"} {@link Feature} to the <u>regionBorders</u> collection individually.
 * @param geoJSON {@link \"GeoJSON\"} to insert to the collection.
 */
export async function saveFeatures(geoJSON: FeatureCollectionWithCRS<MultiPolygon | Polygon, FeatureProperties>) {

    let geoJSONProjectionInformation = await requestProjectionInformation(geoJSON.crs)

    console.log("Started separating Multi Polygons.")
    let separatedGeoJSON = separateMultiPolygons(geoJSON)
    console.log("Finished separating Multi Polygons.")


    // Convert each feature of the geoJSON
    let convertedFeatures: Feature<Polygon, FeatureProperties>[] = []
    for (const currentFeature of separatedGeoJSON.features) {
        let convertedFeature = convertFeatureCoordinatesToLatLong(currentFeature, geoJSONProjectionInformation)
        convertedFeatures.push(convertedFeature)
    }

    let convertedFeaturesDocuments: FeatureDocument[] = []
    for (const currentFeature of convertedFeatures) {
        let featureDocument: FeatureDocument = {
            feature: currentFeature
        }
        convertedFeaturesDocuments.push(featureDocument)
    }

    // Save the converted features to the database
    let regionBordersCollection = DatabaseEngine.getFeaturesCollection();
    await regionBordersCollection.insertMany(
        convertedFeaturesDocuments
    );
}

/**
 * Query the <u>regionBorders</u> collection for some features.
 * @param featuresQuery The query to make to the region borders collection.
 * @param featuresQueryProjection The fields of the collection {@link FeatureDocument} to return in the query.
 * @return  Array containing each {@link FeatureDocument} queried.
 */
export async function queryFeatureDocuments(featuresQuery: Filter<Document>, featuresQueryProjection: FeaturesProjection) {

    //featuresQuery.type = "Feature"; // In addition to the query parameters passed as argument, query for various features in the region borders collection

    let featuresQueryOptions: FindOptions = {
        projection: featuresQueryProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults = await DatabaseEngine.getFeaturesCollection()
        .find(featuresQuery, featuresQueryOptions)
        .toArray() as FeatureDocument[];

    return featuresQueryResults;
}

/**
 * Query the region borders collection for all features, and return them in an array.
 * @param queryProjection The fields of the collection {@link FeatureDocument} to return in the query.
 * @return Array containing every {@link FeatureDocument} in the <u>regionBorders</u> collection.
 * */
export async function queryAllFeatureDocuments(queryProjection: FeaturesProjection) {
    let featuresQuery: Filter<Document> = {}; // Query for all documents in the region borders collection
    let featuresQueryOptions: FindOptions = {
        projection: queryProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    console.log("Querying features collection for all features.");
    let featuresQueryResults = await DatabaseEngine.getFeaturesCollection()
        .find(featuresQuery, featuresQueryOptions)
        .toArray() as FeatureDocument[];
    return featuresQueryResults;
}

/**
 * Query the <u>weather</u> collection for some weathers
 * @param featuresQuery The query to make to the region borders collection.
 * @param featuresQueryProjection The fields of the collection {@link FeatureDocument} to return in the query.
 * @return  Array containing each {@link FeatureDocument} queried.
 */
export async function queryWeatherDocuments(weatherDateID: ObjectId, featuresQueryProjection: WeatherProjection) {

    const regionBordersCollectionName = DatabaseEngine.getFeaturesCollectionName();

    /* const regionsWithWeatherDocuments = await DatabaseEngine.getWeatherCollection()
        .aggregate([
            {
                $match: { weatherDateObjectId: weatherDateID }
            },
            {
                $match: { "weather.error.code": { $exists: false } }
            },
            {
                $project: featuresQueryProjection
            },
            {
                $lookup: {
                    from: regionBordersCollectionName,
                    localField: 'regionBorderFeatureObjectId',
                    foreignField: '_id',
                    as: 'feature'
                }
            },
            {
                $limit: 2
            }
        ])
        .toArray() as WeatherCollectionDocumentWithFeature[]; */

        const weatherCollectionName = DatabaseEngine.getWeatherCollectionName();
        const regionsWithWeatherDocuments = await DatabaseEngine.getFeaturesCollection().aggregate([
            {
                $match: { "center": { $exists: true } }
            },
            {
                $lookup: {
                    from: weatherCollectionName,
                    localField: '_id',
                    foreignField: 'regionBorderFeatureObjectId',
                    as: 'weather',
                    pipeline: [
                        {
                            $match: { "weatherDateObjectId": weatherDateID },
                        },
                        {   
                            $project: { _id: 0, "weatherDateObjectId": 0, "regionBorderFeatureObjectId": 0 } 
                        }
                    ],
                }
            },
            {
                $limit: 5
            }
        ])
        .toArray() as WeatherCollectionDocumentWithFeature[];

    return regionsWithWeatherDocuments;
}

// Returns a JSON with the various dates the weather was saved in the database
export async function queryAllWeatherDates() {
    let weatherDatesQuery = {}; // Query all weather dates to return to the client
    let weatherDatesProjection = {_id: 1, date: 1}; // Only the date itself needs to be returned by the query
    let weatherDatesQueryOptions = {
        projection: weatherDatesProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults = await DatabaseEngine.getWeatherDatesCollection()
        .find(weatherDatesQuery, weatherDatesQueryOptions)
        .toArray();

    return featuresQueryResults;
}
