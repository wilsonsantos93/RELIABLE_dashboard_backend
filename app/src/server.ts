import dotenv from "dotenv"; //! Importing environment variables to connect to the database engine
import {DatabaseEngine} from "./configs/mongo.js"; //! Database engine connection
import express from "express";
import cors from "cors"; //! Cross-origin resource sharing

//! Routers
import {regionBordersRouter} from "./routes/features.js";
import {weatherRouter} from "./routes/weather.js";
import {librariesRouter} from "./routes/libraries.js";
import {configRouter} from "./routes/config.js";
import {mapRouter} from "./routes/map.js"

dotenv.config({path: "./.env"}); // Loads .env file contents into process.env

await DatabaseEngine.connectToDatabaseEngine();

let app = express();

//! EJS Template engine
app.set("view engine", "ejs");
app.set("views", ("./src/views/"));

app.use(cors());

app.use("/", regionBordersRouter); // Import region border routes into the root path '/'
app.use("/", weatherRouter); // Import weather routes into the root path '/'
app.use("/", librariesRouter); // Import libraries routes into the root path '/'
app.use("/", configRouter); // Import config routes into the root path '/'
app.use("/", mapRouter); // Import map routes into the root path '/'

//! Start server
app.listen(process.env.PORT, function () {
    console.log("Weather data server started listening on port " + process.env.PORT + ".\n");
});
