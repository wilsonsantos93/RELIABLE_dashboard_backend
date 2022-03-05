//! Express
import express from "express";
export let regionBordersRouter = express.Router();

//! Database engine connection
import { DatabaseEngine } from "../config/mongo.js";

//! Middleware
// regionBordersRouter.use(express.urlencoded({extended: true}));
// reginBordersRouter.use(express.json());

//! Get region borders data route
regionBordersRouter.get("/getRegionBordersData", function (request, response) {
    const regionBordersDataCollection =
        DatabaseEngine.getRegionBordersCollection();

    const query = {}; // Query all documents in the database

    // Don't include each document's ID in the query results
    const options = {
        projection: { _id: 0, type: 1, geometry: 1, properties: 1 },
    };

    // Queries database and sends the information to the client that requested it
    regionBordersDataCollection
        .find(query, options)
        .toArray(function (error, result) {
            if (error) throw error;

            // The database query result is an array of geoJSON features
            // We need to return a geoJSON to the front end, and a geoJSON has a type, and the array of features
            let geoJSON = { type: "FeatureCollection", features: result };
            response.send(geoJSON);
        });
});

//! Page that allows a client to select a geoJSON document to be saved to the database collection, or delete the already existing collection
regionBordersRouter.get("/regionBorders", function (request, response) {
    response.sendFile("uploadJSON.html", { root: "./src/views" });
});

//! Client sends a geoJSON to be saved to the database
import multer from "multer";
const storage = multer.memoryStorage(); // Use RAM to temporarily store the received geoJSON, before parsing it and saving it to the database
const upload = multer({ storage: storage });
// https://stackoverflow.com/questions/31530200/node-multer-unexpected-field
regionBordersRouter.post(
    "/saveRegionBorders",
    upload.single("geojson"),
    function (request, response) {
        //! Parse received file to JSON
        console.log("Received geoJSON from the client.");
        let fileBuffer = request.file.buffer; // Multer enables the server to access the file sent by the client using "request.file.buffer". The file accessed is in bytes.
        let trimmedFileBuffer = fileBuffer
            .toString("utf-8")
            .trimStart()
            .trimEnding(); // Sometimes the geoJSON sent has unnecessary spaces that need to be trimmed
        let geoJSON = JSON.parse(trimmedFileBuffer); // Parse the trimmed file buffer to a correct geoJSON
        // console.log(geoJSON)

        //! RoutersSave JSON to database and send response to the client
        const regionBordersCollection = DatabaseEngine.getRegionBordersCollection();

        // Save geoJSON coordinate reference system to the collection
        regionBordersCollection.insertOne(
            geoJSON.crs,
            function (insertingError, databaseResponse) {
                if (insertingError) {
                    response.send(error);
                }
                console.log(
                    "Inserted geoJSON coordinate reference system in the database."
                );
            }
        );

        // Save geoJSON features to the collection
        regionBordersCollection.insertMany(
            geoJSON.features,
            function (insertingError, databaseResponse) {
                if (insertingError) {
                    response.send(error);
                }
                console.log("Inserted geoJSON  features in the database.");
                // console.log(databaseResponse)

                // Send successful response to the client
                let responseMessage = "";
                responseMessage += "Server successfully saved geoJSON.<br><br>";
                responseMessage +=
                    "<a href='javascript:history.back()'>Return to the last page.</a>";
                response.send(responseMessage);
            }
        );
    }
);

//! Client requests the region borders collection to be deleted
regionBordersRouter.post("/deleteRegionBorders", async function (request, response) {
    console.log("Client requested to drop the region borders collection.");

    // Drop database and send response to the server.
        await DatabaseEngine.getRegionBordersCollection().drop(function (
            dropError,
            databaseResponse
        ) {

            //* Error handling
            if (dropError.codeName == "NamespaceNotFound") {
                console.log("Database doesn't exist (was probably already deleted)")
                response.send("Database doesn't exist (was probably already deleted).")
                return dropError
            }
            else if (dropError) {
                console.log(dropError)
                response.send(dropError)
                return dropError
            }

            console.log("Deleted region borders data from the database.");

            // Send successful response to the client
            let responseMessage = "";
            responseMessage +=
                "Server successfully deleted region borders from the database.<br><br>";
            responseMessage +=
                "<a href='javascript:history.back()'>Return to the last page.</a>";
            response.send(responseMessage);
        });
        

});
