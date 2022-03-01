// Environment variables for the database connection
import dotenv from 'dotenv';
dotenv.config(); // Loads .env file contents into process.env.

// Mongo
import { MongoClient as mongo} from "mongodb";

export class databaseEngine {

    static #databaseEngineConnection;

    static connectToDatabase() {

        let databaseConnectionString = 'mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_URL + '/weatherVisualizer';
        this.databaseEngineConnection = new mongo(databaseConnectionString);
        this.databaseEngineConnection.connect().then(
            console.log("Connected to MongoDB engine.")
        );

    }

    static getConnection() {
        return this.databaseEngineConnection
    }

}

