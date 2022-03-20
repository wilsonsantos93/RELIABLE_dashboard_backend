import dotenv from "dotenv"; //! Importing environment variables to connect to the database engine
import {DatabaseEngine} from "./configs/mongo.ts"; //! Database engine connection
import express from "express";
import cors from "cors"; //! Cross-origin resource sharing
//! Routers
import {regionBordersRouter} from "./routes/regionBorders.ts";
import {weatherRouter} from "./routes/weather.ts";
import {librariesRouter} from "./routes/libraries.ts";
import {configRouter} from "./routes/config.ts";
import {databaseDeletesRouter} from "./routes/databaseDeletes.ts";
import {mapRouter} from "./routes/map.ts"

dotenv.config({path: "./src/configs/.env"}); // Loads .env file contents into process.env

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
app.use("/", databaseDeletesRouter); // Import database deletes routes into the root path '/'
app.use("/", mapRouter); // Import map routes into the root path '/'

//! Start server
app.listen(process.env.WEATHER_DATA_PORT, function () {
    console.log(
        "Weather data server started listening on port " + process.env.WEATHER_DATA_PORT + ".\n"
    );
});
