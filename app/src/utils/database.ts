import {DatabaseEngine} from "../configs/mongo.js";
import {convertFeatureCoordinatesToLatLong, requestProjectionInformation, separateMultiPolygons} from "./features.js";
import {Db, Document, Filter, FindOptions, ObjectId} from "mongodb";
import {FeatureDocument} from "../types/DatabaseCollections/FeatureDocument";
import {
    WeatherCollectionDocument,
    WeatherCollectionDocumentWithFeature
} from "../types/DatabaseCollections/WeatherCollectionDocument";
import {WeatherProjection} from "../types/DatabaseCollections/Projections/WeatherProjection";
import {FeaturesProjection} from "../types/DatabaseCollections/Projections/FeaturesProjection";
import {Feature, MultiPolygon, Polygon} from "geojson";
import {FeatureProperties} from "../types/FeatureProperties";
import {FeatureCollectionWithCRS} from "../types/FeatureCollectionWithCRS";
import { BoundingBox } from "../types/BoundingBox.js";

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

    const collectionsInDatabase = await database.listCollections().toArray();

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
export async function queryFeatureDocuments(
    featuresQuery: Filter<Document>, 
    featuresQueryProjection: any,
    skip: number = 0,
    limit: number = 0) {

    //featuresQuery.type = "Feature"; // In addition to the query parameters passed as argument, query for various features in the region borders collection

    let featuresQueryOptions: FindOptions = {
        projection: featuresQueryProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults = await DatabaseEngine.getFeaturesCollection()
        .find(featuresQuery, featuresQueryOptions)
        .limit(limit)
        .skip(skip)
        .collation({ locale: "pt", strength: 1 })
        .toArray() as FeatureDocument[];

    return featuresQueryResults;
}


/**
 * Query the region borders collection for all features, and return them in an array.
 * @param queryProjection The fields of the collection {@link FeatureDocument} to return in the query.
 * @return Array containing every {@link FeatureDocument} in the <u>regionBorders</u> collection.
 * */
export async function queryAllFeatureDocuments(queryProjection: any, skip: number = 0, limit: number = 0) {
    let featuresQuery: Filter<Document> = {}; // Query for all documents in the region borders collection
    let featuresQueryOptions: FindOptions = {
        projection: queryProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    try {
        console.log("Querying features collection for all features.");
        console.log(skip, limit)
        let featuresQueryResults = await DatabaseEngine.getFeaturesCollection()
            .find(featuresQuery, featuresQueryOptions)
            .limit(limit)
            .skip(skip)
            .toArray() as FeatureDocument[];

        return featuresQueryResults;
    } catch (e) {
        console.error(e);
        return []
    }
}


/**
 * Query the <u>weather</u> collection for some weathers
 * @param featuresQuery The query to make to the region borders collection.
 * @param featuresQueryProjection The fields of the collection {@link FeatureDocument} to return in the query.
 * @return  Array containing each {@link FeatureDocument} queried.
 */
export async function queryWeatherDocuments(
    weatherDateID: ObjectId, 
    coordinates: BoundingBox = null,
    useCenters: boolean = false
) {
    const weatherCollectionName = DatabaseEngine.getWeatherCollectionName();

    const pipeline = [];
    pipeline.push({ $match: { "center": { $exists: true } } });

    if (coordinates) {
        if (useCenters) {
            pipeline.push({ 
                $match: {
                    'center.coordinates.0': { $gte: coordinates.sw_lng, $lte: coordinates.ne_lng },
                    'center.coordinates.1': { $gte: coordinates.sw_lat, $lte: coordinates.ne_lat }
                } 
            })
        } else {
            pipeline.push({ 
                $match: {
                    'geometry': {
                        $geoIntersects: {
                            $geometry: {
                                type: "Polygon",
                                coordinates: [
                                    [
                                        [coordinates.ne_lng, coordinates.sw_lat], 
                                        [coordinates.sw_lng, coordinates.ne_lat], 
                                        [coordinates.ne_lng, coordinates.ne_lat], 
                                        [coordinates.sw_lng, coordinates.sw_lat],
                                        [coordinates.ne_lng, coordinates.sw_lat]
                                    ]
                                ]
                            }
                        }
                    }
                } 
            })
        }
    }

    pipeline.push({ 
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
    });

    const regionsWithWeatherDocuments = await DatabaseEngine.getFeaturesCollection().aggregate(pipeline).toArray() as WeatherCollectionDocumentWithFeature[];

    return regionsWithWeatherDocuments;
}


/**
 * Gets all weather dates
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns A JSON with the various dates saved in the database
 */
export async function queryAllWeatherDates() {
    let weatherDatesQuery = {}; // Query all weather dates to return to the client
    let weatherDatesProjection = { _id: 1, date: 1 }; // Only the date itself needs to be returned by the query
    let weatherDatesQueryOptions = {
        projection: weatherDatesProjection,
    };

    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    try {
        const featuresQueryResults = await DatabaseEngine.getWeatherDatesCollection()
            .find(weatherDatesQuery, weatherDatesQueryOptions)
            .toArray();
            
        return featuresQueryResults;
    } catch (e) {
        console.error(e);
        return [];
    }
}

/**
 * Gets fields from the specified collection
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns An array containing the field names
 */
export async function getCollectionFields(collectionName: string, find: any, projection: any) {
    function flattenObject(obj: any, prefix = '') {
        return Object.keys(obj).reduce((acc:any, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && k != "_id") Object.assign(acc, flattenObject(obj[k], pre + k));
            else acc[pre + k] = obj[k];
            return acc;
        }, {});
    }

    try {
        const data = await DatabaseEngine.getCollection(collectionName).find(find, { projection }).toArray();
        let columnNames: any = [];
        for (const d of data) {
            const keys = Object.keys(flattenObject(d))
            for (const k of keys) {
                if (!columnNames.includes(k)) columnNames.push(k);
            }
        }
        return columnNames;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

/**
 * Gets data to use with Datatables
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns An object containing the data and number of records
 */
export async function getDatatablesData(collectionName: string, projection: any, dtInfo: any, pipeline: any[] = null) {
    try {
        let skip = parseInt(dtInfo.start) || 0;
        let limit = parseInt(dtInfo.length) || 0;

        const find: any = {};
        if (dtInfo.columns && dtInfo.columns.length) {
            for (const col of dtInfo.columns) {
                if (!col.search.value || col.search.value == '') continue;
                if (col.name == "_id" && ObjectId.isValid(col.search.value)) find[col.name] = new ObjectId(col.search.value);
                else find[col.name] = new RegExp(col.search.value, 'i');
            }
        }

        let recordsTotal = 0;
        let recordsFiltered: any = 0;
        let data = [];

        recordsTotal = await DatabaseEngine.getCollection(collectionName).estimatedDocumentCount();
        recordsFiltered = await DatabaseEngine.getCollection(collectionName).countDocuments(find);
        data = await DatabaseEngine.getCollection(collectionName).find(find, { projection }).skip(skip).limit(limit).toArray();
    
        return { 
            data: data,
            draw: dtInfo.draw, 
            recordsTotal: recordsTotal,
            recordsFiltered: recordsFiltered
        };
    } catch (e) {
        throw e;
    }
}

/**
 * Generate all possibilites for a string replacement
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns An array containing all possible strings
 */
export function allReplacements(str: string, char: string, replace: string) {
    function powerset (a: any) {
        return _powerset([[]], a) 
    };

    function _powerset(out: any, rest: string): any {
        return rest.length ?
            _powerset(
                out.concat(out.map((x: any) => x.concat(rest[0]))),
                rest.slice(1)
            )
            : out;
    }

    function enumerate (str: string, char: string) {
        return [...str].map((c, i) => [c, i])
        .filter(p => p[0] === char)
        .map(p => p[1]);
    }

    function translate (str: string, pos: any, replace: string) {
        return [...str].map((c, i) => pos.includes(i) ? replace : c).join('');
    } 

    return powerset(enumerate(str, char)).map((pos: any) => translate(str, pos, replace));
}