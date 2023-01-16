import dotenv from "dotenv"; //! Importing environment variables to connect to the database engine
import {DatabaseEngine} from "./configs/mongo.js"; //! Database engine connection
import express from "express";
import cors from "cors"; //! Cross-origin resource sharing
import router from "./routes";
dotenv.config({path: "./.env"}); // Loads .env file contents into process.env

await DatabaseEngine.connectToDatabaseEngine();

let app = express();

//! EJS Template engine
app.set("view engine", "ejs");
app.set("views", ("./src/views/"));

// use CORS
app.use(cors());

//use Router
app.use(router);

//! Start server
app.listen(process.env.PORT, function () {
    console.log("Weather data server started listening on port " + process.env.PORT + ".\n");
});