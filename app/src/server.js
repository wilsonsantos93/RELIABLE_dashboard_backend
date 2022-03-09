//! Importing environment variables to connect to the database engine
import dotenv from "dotenv";
dotenv.config({ path: "./src/configs/.env" }); // Loads .env file contents into process.env
// console.log(process.env)

//! Database engine connection
import { DatabaseEngine } from "./configs/mongo.js";
await DatabaseEngine.connectToDatabaseEngine();

//! Express
import express from "express";
let app = express();

//! Cross-origin resource sharing
import cors from "cors";
app.use(cors());

//! Routers
import { regionBordersRouter } from "./routes/regionBorders.js";
app.use("/", regionBordersRouter); // Import region border routes into the root path '/'
import { weatherRouter } from "./routes/weather.js";
app.use("/", weatherRouter); // Import weather routes into the root path '/'
import { librariesRouter } from "./routes/libraries.js";
app.use("/", librariesRouter); // Import libraries routes into the root path '/'
import { configRouter } from "./routes/config.js";
app.use("/", configRouter); // Import config routes into the root path '/'
import { databaseDeletesRouter } from "./routes/databaseDeletes.js";
app.use("/", databaseDeletesRouter); // Import config routes into the root path '/'

//! Root route
app.get("/", function (request, response) {
  // response.send("Root route for the backend container.")
  response.sendFile(
    "/media/shared/My Programs/weather_dashboard_backend/app/src/views/map.html"
  );
});

//! Start server
app.listen(process.env.WEATHER_DATA_PORT, function () {
  console.log(
    `Weather data server started listening on port ${process.env.WEATHER_DATA_PORT}.\n`
  );
});

// import * as proj4js from "./libs/proj4.js"
// var EPSG3763 = "+proj=tmerc +lat_0=39.66825833333333 +lon_0=-8.133108333333334 +k=1 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs";
// var EPSG4258 = "+proj=longlat +ellps=GRS80 +no_defs";
// //I'm not going to redefine those two in latter examples.
// console.log(proj4(EPSG3763,EPSG4258,[2,5]));

