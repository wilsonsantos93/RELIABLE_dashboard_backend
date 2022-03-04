//! Express
import express from "express";
export let router = express.Router();

//! Database engine connection
import { databaseEngine } from "./mongo.js"

//! Middleware
router.use(express.urlencoded({extended: true}));
router.use(express.json());

//! Root route
router.get("/", function (request, response) {

    response.send("Root route for the backend container.")

});

//! Get weather data route
router.get("/getWeatherData", function (request, response) {
    const weatherDashboardDatabase = databaseEngine.getConnection().db("weatherDashboard");
    const weatherDataCollection = weatherDashboardDatabase.collection("weatherData");
    
    const query = { "location.name": "Porto Santo" }; // Build database query for the specific location name

    // Include only the wind_kph and temp_c fields in the returned document
    const options = {
        projection: { "_id": 0, "current.wind_kph": 1, "current.temp_c": 1 },
    };

    // Queries database and sends the information to the client that requested it
    weatherDataCollection.find(query, options).toArray(function(error, result) {
        if (error) throw error;
        // console.log(result);
        response.send(result)
        databaseEngine.getConnection().close();
    });

});

//! Get region borders data route
router.get("/getRegionBordersData", function (request, response) {
    const weatherDashboardDatabase = databaseEngine.getConnection().db("weatherDashboard");
    const regionBordersDataCollection = weatherDashboardDatabase.collection("regionBordersData");
    
    const query = {}; // Query all documents

    // Include only the coordinates in the returned document
    const options = {
        projection: { "_id": 0, "features.geometry.coordinates": 1,},
    };

    // Queries database and sends the information to the client that requested it
    regionBordersDataCollection.find(query, options).toArray(function(error, result) {
        if (error) throw error;
        // console.log(result);
        response.send(result)
        databaseEngine.getConnection().close();
    });

});
 

//! Page that allows a client to select a JSON document to be sent to the server
router.get("/saveJSON", function (request, response) {
    response.sendFile('uploadJSON.html', { root: './src' })
});

//! Client requests a geoJSON to be saved to the database 
import multer from "multer"
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
// https://stackoverflow.com/questions/31530200/node-multer-unexpected-field
router.post("/saveJSON", upload.single('geojson'), function (request, response) {

    console.log("Received JSON from the client.")
    // console.log("File received information.")
    console.log(request.file.buffer.toString('utf8'))
    let responseMessage = ""
    responseMessage += "Server successfully received JSON.<br>"
    responseMessage += "<a href='javascript:history.back()'>Voltar atrás.</a>"
    response.send(responseMessage)

});


export class InsertJson {
    static async insertJsonInBd(req) {
        //check if the data is valid
        if (!CheckJson.isValid(req)) {
            return { "msg": "invalid data to insert", "code": 500 };
        }
        var json = req.body.data;
        var db = DbConfig.getDatabaseInstance();
        if (!db) {
            return { "msg": "cannot connect to database", "code": 500 };
        }

        var collectionName = req.body.collectionName;
        if (!collectionName) {
            return { "msg": "invalid collection name", "code": 500 };
        }

        var result = await InsertJson.insertJsonDataInBd(json,collectionName);
        return result;


    }

    static async insertJsonDataInBd(data, collectionName) {
        var db = DbConfig.getDatabaseInstance();
        const collection = db.collection(collectionName);

        var error = false;
        await collection.insertMany(data, (err, res) => {
            if (err) error = true;

            else error = false;
        });

        if (error)
            return { "msg": "error inserting data", "code": 500 };
        else
            return { "msg": "data inserted with success", "code": 201 };
    }
};

