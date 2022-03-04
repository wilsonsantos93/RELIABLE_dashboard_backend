//! Mongo database engine class
import { MongoClient as mongo} from "mongodb";
export class databaseEngine {

    static #databaseEngineConnection;

    static async connectToDatabase() {

        let databaseConnectionString = 'mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_URL;
        this.databaseEngineConnection = new mongo(databaseConnectionString);
        await this.databaseEngineConnection.connect();
        console.log("Connected to MongoDB engine.");
        

    }

    static getConnection() {
        return this.databaseEngineConnection
    }

}

