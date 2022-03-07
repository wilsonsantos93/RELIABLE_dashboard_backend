import { DatabaseEngine } from "../configs/mongo.js";

//* Returns true if a collection exists in the dashboard database, false if it doesn't
export async function collectionExistsInDatabase(collectionName) {
  var collectionExists = false;

  var collectionsInDatabase = await DatabaseEngine.getDashboardDatabase()
    .listCollections()
    .toArray();

  collectionsInDatabase.forEach(function (collectionInDatabase) {
    if (collectionInDatabase.name === collectionName) {
      collectionExists = true;
    }
  });

  return collectionExists;
}

//* Save a coordinates reference system to the database
//* Returns the database ObjectId of the crs document inserted
export async function saveCRS(geoJSON) {
  let crsCollection = DatabaseEngine.getCRScollection();
  let databaseResponse = await crsCollection.insertOne({
    crs: geoJSON.crs,
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
export async function getRegionBordersFeatures(query, queryProjection) {
  query.type = "Feature"; // In addition to the query parameters passed as argument, query for various features in the region borders collection

  // Don't include each document's ID in the query results
  let featuresQueryOptions = {
    projection: queryProjection,
  };
  // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
  console.log("Querying region borders collection for the various features.");
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
  let featuresQuery = {}; // Query for all documents in the region borders collection

  let featuresQueryOptions = {
    projection: queryProjection,
  };
  // The following query returns [{crs: Object,...}, {crs: Object},...]
  console.log(
    "Querying coordinates reference systems collection for all CRSs."
  );
  let featuresQueryResults = await DatabaseEngine.getCRScollection()
    .find(featuresQuery, featuresQueryOptions)
    .toArray();
  return featuresQueryResults;
}


