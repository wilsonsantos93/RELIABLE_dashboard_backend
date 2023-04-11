//! Mongo database engine class
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" }); // Loads .env file contents into process.env
export class DatabaseEngine {
    /**
     * Connects node to the database engine
     */
    static async connectToDatabaseEngine() {
        // Connect to the database engine
        let databaseConnectionString = `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_URL}/${process.env.DB_NAME}`;
        this.databaseEngineConnection = new MongoClient(databaseConnectionString);
        await this.databaseEngineConnection.connect();
        // Verify connection
        await this.databaseEngineConnection.db("admin").command({ ping: 1 });
        console.log("Connected to MongoDB engine.");
    }
    //! Dashboard database
    static getDashboardDatabase() {
        return this.databaseEngineConnection.db(this.databaseName);
    }
    //! Get collection by name
    static getCollection(collectionName) {
        return this.getDashboardDatabase().collection(collectionName);
    }
    //! Weather dates collection
    static getWeatherDatesCollection() {
        return this.getDashboardDatabase().collection(this.weatherDatesCollectionName);
    }
    static getWeatherDatesCollectionName() {
        return this.weatherDatesCollectionName;
    }
    //! Weather collection
    static getWeatherCollectionName() {
        return this.weatherCollectionName;
    }
    static getWeatherCollection() {
        return this.getDashboardDatabase().collection(this.weatherCollectionName);
    }
    //! Region borders collection
    static getFeaturesCollectionName() {
        return this.regionBordersCollectionName;
    }
    static getFeaturesCollection() {
        return this.getDashboardDatabase().collection(this.regionBordersCollectionName);
    }
    //! Users collection
    static getUsersCollectionName() {
        return this.usersCollectionName;
    }
    static getUsersCollection() {
        return this.getDashboardDatabase().collection(this.usersCollectionName);
    }
    //! Weather Metadata collection
    static getWeatherMetadataCollectionName() {
        return this.weatherMetadataCollectionName;
    }
    static getWeatherMetadataCollection() {
        return this.getDashboardDatabase().collection(this.weatherMetadataCollectionName);
    }
    //! CRS collection
    static getCRSCollectionName() {
        return this.crsCollectionName;
    }
    static getCRSCollection() {
        return this.getDashboardDatabase().collection(this.crsCollectionName);
    }
}
DatabaseEngine.databaseName = process.env.DB_NAME; // Name of the database in the mongo database engine
DatabaseEngine.weatherDatesCollectionName = process.env.DB_WEATHER_DATES_COLLECTION_NAME; // Name of the collection that contains the dates that the various weather data documents were saved, and the id of the corresponding weather data documents
DatabaseEngine.weatherCollectionName = process.env.DB_WEATHER_COLLECTION_NAME; // Name of the collection that contains the weather data of the various features, and the id of the corresponding features
DatabaseEngine.regionBordersCollectionName = process.env.DB_REGION_BORDERS_COLLECTION_NAME; // Name of the collection that contains region borders information such as the coordinates that make the border on the map, the region name, and those coordinates reference system
DatabaseEngine.usersCollectionName = process.env.DB_USERS_COLLECTION_NAME || "users";
DatabaseEngine.weatherMetadataCollectionName = process.env.DB_WEATHER_METADATA_COLLECTION_NAME || "metadata";
DatabaseEngine.crsCollectionName = process.env.DB_WEATHER_CRS_COLLECTION_NAME || "crs";
//# sourceMappingURL=mongo.js.map