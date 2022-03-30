import {DatabaseEngine} from "../configs/mongo.js";
import fetch from "cross-fetch";
import {convertFeatureCoordinatesToLatLong, separateMultiPolygons} from "./regionBorders.js";
import {Db, Document, Filter, FindOptions} from "mongodb";
import {CoordinatesReferenceSystem} from "../interfaces/GeoJSON/CoordinatesReferenceSystem.js";
import {GeoJSON} from "../interfaces/GeoJSON.js";
import {CRSAnyProperties} from "../interfaces/GeoJSON/CoordinatesReferenceSystem/CRSAnyProperties.js";
import {FeatureDocument} from "../interfaces/DatabaseCollections/FeatureDocument";
import {WeatherCollectionDocument} from "../interfaces/DatabaseCollections/WeatherCollectionDocument";
import {WeatherProjection} from "../interfaces/DatabaseCollections/Projections/WeatherProjection";
import {FeaturesProjection} from "../interfaces/DatabaseCollections/Projections/FeaturesProjection";
import {FeatureGeometryMultiPolygon} from "../interfaces/GeoJSON/Feature/FeatureGeometry/FeatureGeometryMultiPolygon";
import {FeatureGeometryPolygon} from "../interfaces/GeoJSON/Feature/FeatureGeometry/FeatureGeometryPolygon";
import {Feature} from "../interfaces/GeoJSON/Feature";

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
 * Fetches and returns the projection information of a {@link CoordinatesReferenceSystem} from an external API.
 * @param crsProperties The {@link CoordinatesReferenceSystem} to fetch the projection information.
 * @return The {@link CoordinatesReferenceSystem} information.
 */
async function fetchProjectionInformation(crsProperties: CRSAnyProperties) {
    let projectionNumber = crsProperties.name.split("::")[1]; // The number of the EPSG projection, used to fetch the projection information from an external API
    let projectionInformationURL =
        "https://epsg.io/" + projectionNumber + ".proj4"; // The URL of the projection information
    const projectionResponse = await fetch(projectionInformationURL);
    let projectionInformation = await projectionResponse.text();

    return projectionInformation;
}

/**
 * Save each {@link GeoJSON} {@link Feature} to the <u>regionBorders</u> collection individually.
 * @param geoJSON {@link GeoJSON} to insert to the collection.
 */
export async function saveFeatures(geoJSON: GeoJSON<FeatureGeometryMultiPolygon | FeatureGeometryPolygon, CRSAnyProperties>) {
    let regionBordersCollection = DatabaseEngine.getFeaturesCollection();

    console.log("Started separating Multi Polygons.")
    let separatedGeoJSON = separateMultiPolygons(geoJSON)
    console.log("Finished separating Multi Polygons.")

    let geoJSONProjection = await fetchProjectionInformation(geoJSON.crs.properties)

    // Convert each feature of the geoJSON
    let convertedFeatures: Feature<FeatureGeometryPolygon>[] = []
    for (const currentFeature of separatedGeoJSON.features) {

        let convertedFeature = convertFeatureCoordinatesToLatLong(currentFeature, geoJSONProjection)
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
export async function queryWeatherDocuments(featuresQuery: Filter<Document>, featuresQueryProjection: WeatherProjection) {

    let featuresQueryOptions: FindOptions = {
        projection: featuresQueryProjection,
    };

    let weatherDocuments = await DatabaseEngine.getWeatherCollection()
        .find(featuresQuery, featuresQueryOptions)
        .toArray() as WeatherCollectionDocument[];

    return weatherDocuments;
}
