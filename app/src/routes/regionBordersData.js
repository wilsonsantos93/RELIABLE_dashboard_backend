
//! Express
import express from "express";
export let regionBordersRouter = express.Router();

//! Database engine connection
import { databaseEngine } from "../config/mongo.js"

//! Middleware
regionBordersRouter.use(express.urlencoded({extended: true}));
// reginBordersRouter.use(express.json());

//! Get region borders data route
regionBordersRouter.get("/getRegionBordersData", function (request, response) {
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
regionBordersRouter.get("/saveJSON", function (request, response) {
    response.sendFile('uploadJSON.html', { root: './src' })
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
