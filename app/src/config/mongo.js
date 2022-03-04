//! Mongo database engine class
import { MongoClient } from "mongodb";
export class databaseEngine {

    static #databaseEngineConnection;

    static async connectToDatabaseEngine() {

        // Connect to the database engine
        let databaseConnectionString = 'mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_URL;
        this.databaseEngineConnection = new MongoClient(databaseConnectionString);
        await this.databaseEngineConnection.connect();

        // Verify connection
        await this.databaseEngineConnection.db("admin").command({ ping: 1 });
        console.log("Connected to MongoDB engine.");        

    }

    static getConnection() {
        return this.databaseEngineConnection
    }

    static getDashboardDatabase() {
        return this.databaseEngineConnection.db("weatherDashboard")
    }

    static getWeatherCollection() {
        return this.getDashboardDatabase().collection("weatherDataTest")
    }

    static getRegionBordersCollection() {
        return this.getDashboardDatabase().collection("regionBordersTest")
    }
}

