
//! Express
import express from "express";
export let regionBordersRouter = express.Router();

//! Database engine connection
import { databaseEngine } from "../config/mongo.js"

//! Middleware
// regionBordersRouter.use(express.urlencoded({extended: true}));
// reginBordersRouter.use(express.json());

//! Get region borders data route
regionBordersRouter.get("/getRegionBordersData", function (request, response) {
    const regionBordersDataCollection = databaseEngine.getRegionBordersCollection()
    
    const query = {}; // Query all documents in the database

    // Don't include each document's ID in the query results
    const options = {
        projection: { "_id": 0, "type": 1, "geometry": 1, "properties": 1}
    };

    // Queries database and sends the information to the client that requested it
    regionBordersDataCollection.find(query, options).toArray(function(error, result) {
        if (error) throw error;
        
        // The database query result is an array of geoJSON features
        // We need to return a geoJSON to the front end, and a geoJSON has a type, and the array of features
        let geoJSON = {"type": "FeatureCollection", "features": result}
        response.send(geoJSON)
    });

});
 
//! Page that allows a client to select a JSON document to be sent to the server
regionBordersRouter.get("/saveJSON", function (request, response) {
    response.sendFile('uploadJSON.html', { root: './src/views' })
});

//! Client requests a geoJSON to be saved to the database 
import multer from "multer"
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
// https://stackoverflow.com/questions/31530200/node-multer-unexpected-field
regionBordersRouter.post("/saveJSON", upload.single('geojson'), function (request, response) {

    // Parse received file to JSON
    console.log("Received geoJSON from the client.")
    let fileBuffer = request.file.buffer
    let geoJSON = JSON.parse(fileBuffer)

    // Save JSON to database
    const regionBordersCollection = databaseEngine.getRegionBordersCollection()
    regionBordersCollection.insertMany(geoJSON.features, function (insertingError, databaseResponse) {
        if (insertingError) {response.send(error) }
    });
    
    // Send response to the client
    let responseMessage = ""
    responseMessage += "Server successfully received JSON.<br><br>"
    responseMessage += "<a href='javascript:history.back()'>Return to the last page.</a>"
    response.send(responseMessage)

});
