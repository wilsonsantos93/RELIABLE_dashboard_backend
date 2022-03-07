import { DatabaseEngine } from "../config/mongo.js";

//* Returns true if a collection exists in a database, false if it doesn't
async function collectionExistsInDatabase(collectionName) {
  var collectionExists = false;

  var collectionsInDatabase = await this.getDashboardDatabase()
    .listCollections()
    .toArray();

  collectionsInDatabase.forEach(function (collectionInDatabase) {
    if (collectionInDatabase.name == collectionName) {
      collectionExists = true;
    }
  });

  return collectionExists;
}

//* Save a coordinates reference system to the database
async function saveCRS(geoJSON) {
  let crsCollection = DatabaseEngine.getCRScollection();
  databaseResponse = await regionBordersCollection.insertOne({
    crs: geoJSON.crs,
  });
  return databaseResponse.insertedId;
}

//* Save each geoJSON feature to the collection individually
async function saveFeatures(geoJSON) {
  let regionBordersCollection = DatabaseEngine.getRegionBordersCollection();
  databaseResponse = await regionBordersCollection.insertMany(geoJSON.features);
  return databaseResponse.insertedIds;
}

//* Create a field with on each feature with its associated coordinates reference system
async function associateCRStoFeatures(crsID, featureIDs) {}
