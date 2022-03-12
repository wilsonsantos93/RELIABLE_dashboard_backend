import { DatabaseEngine } from "../configs/mongo.js";
import fetch from "cross-fetch";

//* Returns true if a collection exists in a database, false if it doesn't
export async function collectionExistsInDatabase(collectionName, database) {
  var collectionExists = false;

  var collectionsInDatabase = await database.listCollections().toArray();

  collectionsInDatabase.forEach(function (collectionInDatabase) {
    if (collectionInDatabase.name === collectionName) {
      collectionExists = true;
    }
  });

  return collectionExists;
}

//* Deletes a collection from database
export async function deleteCollectionFromDatabase(collectionName, database) {}

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
  let projectionInformationURL =
    "https://epsg.io/" + projectionNumber + ".proj4"; // The URL of the projection information
  const projectionResponse = await fetch(projectionInformationURL);
  let projectionInformation = await projectionResponse.text();

  return projectionInformation;
}

//* Save a coordinates reference system found on a geoJSON to the database
//* Returns the database ObjectId of the crs document inserted
//* If the crs already exists in the database, return its ObjectId
export async function saveCRS(geoJSON) {
  let crsCollection = DatabaseEngine.getCRScollection();

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

//* Save each geoJSON feature to the collection individually
//* Returns an array of the database ObjectIds of the features inserted
export async function saveFeatures(geoJSON) {
  let regionBordersCollection = DatabaseEngine.getRegionBordersCollection();
  let databaseResponse = await regionBordersCollection.insertMany(
    geoJSON.features
  );
  // insertMany returns some unnecessary parameters
  // it also returns {'0': new ObjectId("62266ee5a6f882dc9e143bfa"), '1': new ObjectId("62266ee5a6f882dc9e143bfb"), ...}
  // This JSON with the various ObjectIDs can be accessed with databaseResponse.insertedIds
  // To convert the returned JSON to an array with only the ObjectIDs, we use Object.values(databaseResponse.insertedIds)
  let ObjectIdsArray = Object.values(databaseResponse.insertedIds);

  return ObjectIdsArray;
}

//* Create a field on each feature with its associated coordinates reference system
export async function associateCRStoFeatures(crsObjectId, featureObjectIds) {
  //* For each feature that had its ID passed as parameter, associate a crs ID
  for (const featureObjectId of featureObjectIds) {
    // Update the crs ID of a feature in the database
    DatabaseEngine.getRegionBordersCollection().updateOne(
      { _id: featureObjectId }, // Updates the feature database document that has the same ObjectId as the current featureObjectId
      {
        $set: {
          crsObjectId: crsObjectId,
        },
      }
    );
  }
}

//* Query the region borders collection for some features border coordinates and properties, and return them in an array
export async function queryRegionBordersFeatures(query, queryProjection) {
  query.type = "Feature"; // In addition to the query parameters passed as argument, query for various features in the region borders collection
  let featuresQueryOptions = {
    projection: queryProjection,
  };


  // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
  let featuresQueryResults = await DatabaseEngine.getRegionBordersCollection()
    .find(query, featuresQueryOptions)
    .toArray();
  return featuresQueryResults;
}

//* Query the region borders collection for all features, and return them in an array
export async function queryAllRegionBordersFeatures(queryProjection) {
  let featuresQuery = {}; // Query for all documents in the region borders collection
  let featuresQueryOptions = {
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
export async function queryAllCoordinatesReferenceSystems(queryProjection) {
  let CRSsQuery = {}; // Query for all documents in the coordinates reference systems collection
  let CRSsQueryOptions = {
    projection: queryProjection,
  };

  let CRSsQueryResults = await DatabaseEngine.getCRScollection()
    .find(CRSsQuery, CRSsQueryOptions)
    .toArray();

  return CRSsQueryResults;
}