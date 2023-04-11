import { DatabaseEngine } from "../configs/mongo.js";
import { separateMultiPolygons } from "./features.js";
import { ObjectId } from "mongodb";
import fetch from "cross-fetch";
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
export async function collectionExistsInDatabase(collectionName, database) {
    let collectionExists = false;
    const collectionsInDatabase = await database.listCollections().toArray();
    collectionsInDatabase.forEach(function (collectionInDatabase) {
        if (collectionInDatabase.name === collectionName) {
            collectionExists = true;
        }
    });
    return collectionExists;
}
//* Returns a CRS database _id given that it already exists in the CRS collection
//* Returns null otherwise
export async function queryCrsCollectionID(CRS, crsCollection) {
    let crsQuery = { crs: CRS }; // Query for the database document that has the same crs field as the CRS passed as argument
    // We only want to verify if the CRS passed as argument already exists in the database
    // To do so, we only need a crs document field to be returned by the query, like the _id field
    // If no field is returned we know that the CRS argument doesn't exist in the database
    let crsQueryProjection = { _id: 1 };
    let crsQueryOptions = {
        projection: crsQueryProjection,
    };
    let databaseCRS = await crsCollection.findOne(crsQuery, crsQueryOptions);
    //* Returns a CRS database _id given that it exists in the CRS collection
    if (databaseCRS != null) {
        return databaseCRS._id;
    }
    //* Returns null otherwise
    if (databaseCRS == null) {
        return null;
    }
}
//* Fetch the projection information of the feature associated CRS, and return it
async function fetchProjectionInformation(crsName) {
    let projectionNumber = crsName.split("::")[1]; // The number of the EPSG projection, used to fetch the projection information from an external API
    let projectionInformationURL = "https://epsg.io/" + projectionNumber + ".proj4"; // The URL of the projection information
    const projectionResponse = await fetch(projectionInformationURL);
    let projectionInformation = await projectionResponse.text();
    return projectionInformation;
}
//* Save a coordinates reference system found on a geoJSON to the database
//* Returns the database ObjectId of the crs document inserted
//* If the crs already exists in the database, return its ObjectId
export async function saveCRS(geoJSON) {
    let crsCollection = DatabaseEngine.getCRSCollection();
    // Verify if the crs already exists in the database
    let crsCollectionID = await queryCrsCollectionID(geoJSON.crs, crsCollection);
    //* If the crs already exists in the database, return its ObjectID
    if (crsCollectionID != null) {
        return crsCollectionID;
    }
    //* If the crs already doesn't already exist in the database, insert it and its projection information, and return its ObjectID.
    let databaseResponse = await crsCollection.insertOne({
        crs: geoJSON.crs,
        crsProjection: await fetchProjectionInformation(geoJSON.crs.properties.name)
    });
    // insertOne returns some unnecessary parameters
    // it also returns an ObjectId("62266b751239b26c92ec8858") accessed with "databaseResponse.insertedId"
    return databaseResponse.insertedId;
}
//* Create a field on each feature with its associated coordinates reference system
export async function associateCRStoFeatures(crsObjectId, featureObjectIds) {
    //* For each feature that had its ID passed as parameter, associate a crs ID
    for (const featureObjectId of featureObjectIds) {
        // Update the crs ID of a feature in the database
        await DatabaseEngine.getFeaturesCollection().updateOne({ _id: featureObjectId }, // Updates the feature database document that has the same ObjectId as the current featureObjectId
        {
            $set: {
                crsObjectId: crsObjectId
            },
        });
    }
}
//* Query the coordinates reference systems collection for all CRSs, and return them in an array
export async function queryAllCoordinatesReferenceSystems(queryProjection) {
    let CRSsQuery = {}; // Query for all documents in the coordinates reference systems collection
    let CRSsQueryOptions = {
        projection: queryProjection,
    };
    let CRSsQueryResults = await DatabaseEngine.getCRSCollection()
        .find(CRSsQuery, CRSsQueryOptions)
        .toArray();
    return CRSsQueryResults;
}
/**
 * Save each {@link \"GeoJSON\"} {@link Feature} to the <u>regionBorders</u> collection individually.
 * @param geoJSON {@link \"GeoJSON\"} to insert to the collection.
 */
export async function saveFeatures(geoJSON) {
    let regionBordersCollection = DatabaseEngine.getFeaturesCollection();
    let separatedGeoJSON = separateMultiPolygons(geoJSON); // Separates the geoJSON MultiPolygon features into multiple features
    let databaseResponse = await regionBordersCollection.insertMany(separatedGeoJSON.features);
    // insertMany returns some unnecessary parameters
    // it also returns {'0': new ObjectId("62266ee5a6f882dc9e143bfa"), '1': new ObjectId("62266ee5a6f882dc9e143bfb"), ...}
    // This JSON with the various ObjectIDs can be accessed with databaseResponse.insertedIds
    // To convert the returned JSON to an array with only the ObjectIDs, we use Object.values(databaseResponse.insertedIds)
    let ObjectIdsArray = Object.values(databaseResponse.insertedIds);
    return ObjectIdsArray;
}
/**
 * Query the <u>regionBorders</u> collection for some features.
 * @param featuresQuery The query to make to the region borders collection.
 * @param featuresQueryProjection The fields of the collection {@link FeatureDocument} to return in the query.
 * @return  Array containing each {@link FeatureDocument} queried.
 */
export async function queryFeatureDocuments(featuresQuery, featuresQueryProjection, skip = 0, limit = 0) {
    //featuresQuery.type = "Feature"; // In addition to the query parameters passed as argument, query for various features in the region borders collection
    let featuresQueryOptions = {
        projection: featuresQueryProjection,
    };
    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    let featuresQueryResults = await DatabaseEngine.getFeaturesCollection()
        .find(featuresQuery, featuresQueryOptions)
        .limit(limit)
        .skip(skip)
        .collation({ locale: "pt", strength: 1 })
        .toArray();
    return featuresQueryResults;
}
/**
 * Query the region borders collection for all features, and return them in an array.
 * @param queryProjection The fields of the collection {@link FeatureDocument} to return in the query.
 * @return Array containing every {@link FeatureDocument} in the <u>regionBorders</u> collection.
 * */
export async function queryAllFeatureDocuments(queryProjection, skip = 0, limit = 0) {
    let featuresQuery = {}; // Query for all documents in the region borders collection
    let featuresQueryOptions = {
        projection: queryProjection,
    };
    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    try {
        console.log("Querying features collection for all features.");
        let featuresQueryResults = await DatabaseEngine.getFeaturesCollection()
            .find(featuresQuery, featuresQueryOptions)
            .limit(limit)
            .skip(skip)
            .toArray();
        return featuresQueryResults;
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return [];
    }
}
/**
 * Query the <u>weather</u> collection for some weathers
 * @param featuresQuery The query to make to the region borders collection.
 * @param featuresQueryProjection The fields of the collection {@link FeatureDocument} to return in the query.
 * @return  Array containing each {@link FeatureDocument} queried.
 */
export async function queryWeatherDocuments(req, weatherDateID, crsObjectId = null, coordinates = null, useCenters = false) {
    const weatherCollectionName = DatabaseEngine.getWeatherCollectionName();
    const pipeline = [];
    pipeline.push({ $match: { "center": { $exists: true } } });
    if (crsObjectId)
        pipeline[0]["$match"].crsObjectId = crsObjectId;
    if (coordinates) {
        if (useCenters) {
            pipeline.push({
                $match: {
                    'center.coordinates.0': { $gte: coordinates.sw_lng, $lte: coordinates.ne_lng },
                    'center.coordinates.1': { $gte: coordinates.sw_lat, $lte: coordinates.ne_lat }
                }
            });
        }
        else {
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
            });
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
    // project weather fields
    if (!req.user) {
        const fields = await DatabaseEngine.getWeatherMetadataCollection().find({ authRequired: true }).toArray();
        if (fields && fields.length) {
            let projection = { weather: {} };
            fields.forEach(field => {
                projection.weather[field.name] = 0;
            });
            pipeline[pipeline.length - 1]["$lookup"]["pipeline"].push({ $project: projection });
        }
    }
    const regionsWithWeatherDocuments = await DatabaseEngine.getFeaturesCollection().aggregate(pipeline).toArray();
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
    try {
        const featuresQueryResults = await DatabaseEngine.getWeatherDatesCollection()
            .find(weatherDatesQuery, weatherDatesQueryOptions)
            .toArray();
        return featuresQueryResults;
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return [];
    }
}
/**
 * Gets fields from the specified collection
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns An array containing the field names
 */
export async function getCollectionFields(collectionName, find, projection) {
    function flattenObject(obj, prefix = '') {
        if (!obj)
            return;
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && k != "_id")
                Object.assign(acc, flattenObject(obj[k], pre + k));
            else
                acc[pre + k] = obj[k];
            return acc;
        }, {});
    }
    try {
        const data = await DatabaseEngine.getCollection(collectionName).find(find, { projection }).toArray();
        let columnNames = [];
        for (const d of data) {
            const keys = Object.keys(flattenObject(d));
            for (const k of keys) {
                if (!columnNames.includes(k))
                    columnNames.push(k);
            }
        }
        return columnNames;
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        throw e;
    }
}
/**
 * Gets data to use with Datatables
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns An object containing the data and number of records
 */
export async function getDatatablesData(collectionName, projection, dtInfo, pipeline = null) {
    try {
        let skip = parseInt(dtInfo.start) || 0;
        let limit = parseInt(dtInfo.length) || 0;
        const find = {};
        if (!Array.isArray(dtInfo.columns)) {
            let columns = [];
            for (const key in dtInfo.columns) {
                columns.push(dtInfo.columns[key]);
            }
            dtInfo.columns = columns;
        }
        if (dtInfo.columns && dtInfo.columns.length) {
            for (const col of dtInfo.columns) {
                if (!col.search.value || col.search.value == '')
                    continue;
                if (col.name == "_id" && ObjectId.isValid(col.search.value))
                    find[col.name] = new ObjectId(col.search.value);
                else
                    find[col.name] = new RegExp(col.search.value, 'i');
            }
        }
        let recordsTotal = 0;
        let recordsFiltered = 0;
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
    }
    catch (e) {
        throw e;
    }
}
/**
 * Generate all possibilites for a string replacement
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns An array containing all possible strings
 */
export function allReplacements(str, char, replace) {
    function powerset(a) {
        return _powerset([[]], a);
    }
    ;
    function _powerset(out, rest) {
        return rest.length ?
            _powerset(out.concat(out.map((x) => x.concat(rest[0]))), rest.slice(1))
            : out;
    }
    function enumerate(str, char) {
        return [...str].map((c, i) => [c, i])
            .filter(p => p[0] === char)
            .map(p => p[1]);
    }
    function translate(str, pos, replace) {
        return [...str].map((c, i) => pos.includes(i) ? replace : c).join('');
    }
    return powerset(enumerate(str, char)).map((pos) => translate(str, pos, replace));
}
export function getObjectValue(path, obj) {
    return path.split('.').reduce(function (prev, curr) {
        return prev ? prev[curr] : null;
    }, obj);
}
;
//# sourceMappingURL=database.js.map