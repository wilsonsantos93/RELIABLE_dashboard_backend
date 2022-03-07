//! Mongo database engine class
import { MongoClient } from "mongodb";
export class DatabaseEngine {
  static #databaseEngineConnection;
  static #weatherCollectionName = "weather"; // Name of the collection that contains the weather data of the various features, and the id of the corresponding features
  static #regionBordersCollectionName = "regionBorders"; // Name of the collection that contains region borders information such as the coordinates that make the border on the map, the region name, and those coordinates reference system
  static #weatherDates = "weatherDates"; // Name of the collection that contains the dates that the various weather data documents were saved, and the id of the corresponding weather data documents
  //! Database engine connection
  static async connectToDatabaseEngine() {
    // Connect to the database engine
    let databaseConnectionString =
      "mongodb+srv://" +
      process.env.DB_USERNAME +
      ":" +
      process.env.DB_PASSWORD +
      "@" +
      process.env.DB_URL;
    this.#databaseEngineConnection = new MongoClient(databaseConnectionString);
    await this.#databaseEngineConnection.connect();

    // Verify connection
    await this.#databaseEngineConnection.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB engine.");
  }

  static getConnection() {
    return this.#databaseEngineConnection;
  }

  //! Dashboard database
  static getDashboardDatabase() {
    return this.#databaseEngineConnection.db("weatherDashboard");
  }

  //! Weather collection

  //* Weather saved dates collection name
  static getWeatherDatesCollectionName() {
    return this;
  }

  //* Return the weather collection name
  static getWeatherCollectionName() {
    return this.#weatherCollectionName;
  }

  //* Return the weather collection object
  static getWeatherCollection() {
    let weatherCollectionName = this.getRegionBordersCollectionName();
    return this.getDashboardDatabase().collection(weatherCollectionName);
  }

  //! Region borders collection

  //* Return the region borders collection name
  static getRegionBordersCollectionName() {
    return this.#regionBordersCollectionName;
  }

  //* Return if the region border collection exists
  static async regionBordersCollectionExists() {
    let regionBordersCollectionName = this.#regionBordersCollectionName;
    let regionBordersCollectionExists = DatabaseEngine.collectionExists(
      regionBordersCollectionName
    );
    return regionBordersCollectionExists;
  }

  //* Return the region borders collection object
  static getRegionBordersCollection() {
    let regionBordersCollectionName = this.#regionBordersCollectionName;
    return this.getDashboardDatabase().collection(regionBordersCollectionName);
  }

  //* Query the region borders collection for the coordinate reference system, and return it
  static async getRegionBordersCRS() {
    const crsQuery = { "crs.type": "name" }; // Query for the only document in the region borders collection who has a crs.type
    // Don't include the crs document's ID in the query results
    const crsQueryOptions = {
      projection: { _id: 0, crs: 1 },
    };
    // The following query returns {crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::3763' } } }
    console.log("Querying collection for the coordinate reference system.");
    let crsQueryResults = await this.getRegionBordersCollection().findOne(
      crsQuery,
      crsQueryOptions
    );
    return crsQueryResults;
  }

  //* Query the region borders collection for the various features border coordinates and properties, and return them in an array
  static async getRegionBordersFeatures(queryProjection) {
    let featuresQuery = { type: "Feature" }; // Query for various features in the region borders collection
    // Don't include each document's ID in the query results
    let featuresQueryOptions = {
      projection: queryProjection,
    };
    // The following query returns [{type: "Feature",...}, {type:"Feature",...}]
    console.log("Querying region borders collection for the various features.");
    let featuresQueryResults = await this.getRegionBordersCollection()
      .find(featuresQuery, featuresQueryOptions)
      .toArray();
    return featuresQueryResults;
  }

  //! Collection exists
  static async collectionExists(collectionName) {
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
}
