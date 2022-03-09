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
