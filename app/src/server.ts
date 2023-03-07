import dotenv from "dotenv"; //! Importing environment variables to connect to the database engine
import { DatabaseEngine } from "./configs/mongo.js"; //! Database engine connection
import express from "express";
import cors from "cors"; //! Cross-origin resource sharing
import router from "./routes/index.js";
import passport from "passport";
import passportConfig from "./auth/index.js";
import bodyParser from "body-parser";
import schedule from "node-schedule";
import { handleDeleteWeatherAndDates, readWeatherFile } from "./utils/weather.js";
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: "./.env"}); // Loads .env file contents into process.env

// Connect to database
await DatabaseEngine.connectToDatabaseEngine();

// Create express app
let app = express();

// Use body parser
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Init passport
passportConfig(passport);
passport.initialize();
passport.session();

//! EJS Template engine
app.set("view engine", "ejs");
app.set("views", ("./src/views/"));
app.use(express.static(path.join(__dirname, 'views/assets')));

// use CORS
app.use(cors());

//use Router
app.use(router);

// node schedule
schedule.scheduleJob('0 * * * *', async function () {
   await handleDeleteWeatherAndDates();
   await readWeatherFile();
});

//! Start server
app.listen(process.env.PORT, function () {
    console.log("Weather data server started listening on port " + process.env.PORT + ".\n");
});

readWeatherFile();