//! Express
import { Router } from "express";

// Controllers
import { getHomePage, getIndexPage, handleDeleteAll } from "../../controllers/admin/home.js";
import { handleDeleteWeatherDates } from "../../controllers/admin/dates.js"
import { getRegionsPage, getWeatherPage, handleCalculateCenters, handleDeleteRegion, handleDeleteRegions, handleDeleteWeatherRegion, handleGetRegionFields, handleGetRegions, handleGetRegionWithWeather, handleGetWeatherFields, handleSaveRegions } from "../../controllers/admin/regions.js";
import { handleDeleteAllWeather, handleDeleteWeather } from "../../controllers/admin/weather.js";
import { getCreateUserPage, getEditUserPage, getUsersPage, handleCreateUser, handleDeleteUser, handleGetUserFields, handleGetUsers, handleUpdateUser } from "../../controllers/admin/users.js";
import { getLoginPage, handleLogin, handleLogout } from "../../controllers/admin/auth.js";

// Auth
import { authenticateAdmin, forwardAuthenticatedAdmin } from "../../utils/routes.js";

// Mongo-Express UI
import mongo_express_config from "../../configs/mongo-express.config.js";
import { createRequire } from "module";
import multer from "multer";
const require = createRequire(import.meta.url);
const mongo_express = require('mongo-express-enhanced/lib/middleware.js');

const router = Router();

// Get root page
router.get('/', getIndexPage);  
// Get the home page
router.get("/home", authenticateAdmin, getHomePage);

// Get login page
router.get('/login', forwardAuthenticatedAdmin, getLoginPage);
// Route that handles admin login
router.post('/login', handleLogin);
// Route to logout admin
router.get('/logout', authenticateAdmin, handleLogout);

/* //! Page that shows users 
router.get("/users", authenticateAdmin, getUsersPage);
// Page to create a new user
router.get("/user/create", authenticateAdmin, getCreateUserPage);
// Route to insert new user
router.post("/user/create", authenticateAdmin, handleCreateUser);
// Page to edit a user
router.get("/user/:id/edit", authenticateAdmin, getEditUserPage);
//! Route to handle user update
router.post("/user/:id/update", authenticateAdmin, handleUpdateUser);
//! Route to get users
router.get("/getUsers", authenticateAdmin, handleGetUsers);
//! Route to delete a user
router.post("/user/:id/delete", authenticateAdmin, handleDeleteUser);
//! Route to get user collection fields
router.get("/user/fields", authenticateAdmin, handleGetUserFields); */

/* // Page that shows Regions
router.get("/regions", authenticateAdmin, getRegionsPage);
//! Page that shows weather data for a region
router.get("/region/:id/weather", authenticateAdmin, getWeatherPage);
//! Route to get weather data for specific region
router.get("/region/:id/getWeather", authenticateAdmin, handleGetRegionWithWeather);
// Route to get Weather fields
router.get("/region/:id/weather/fields", authenticateAdmin, handleGetWeatherFields);
// Route to get Regions
router.get("/region/getRegions", authenticateAdmin, handleGetRegions);
// Route to get Region fields
router.get("/region/fields", authenticateAdmin, handleGetRegionFields);
// Route to delete a specific region
router.post("/region/:id/delete", authenticateAdmin, handleDeleteRegion);
// Route to delete all weather for a specific region
router.post("/region/:id/weather/deleteAll", authenticateAdmin, handleDeleteWeatherRegion);
// Route to delete all regions
router.post("/region/deleteAll", authenticateAdmin, handleDeleteRegions);
// Route to upload GeoJSON file
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post("/region/save", authenticateAdmin, upload.single("geojson"), handleSaveRegions);
// Router to calculate region centers
router.post("/region/calculateCenters", authenticateAdmin, handleCalculateCenters); */


//! Route to delete all weather
router.post("/weather/deleteAll", authenticateAdmin, handleDeleteAllWeather);
//! Route to delete specific weather
router.post("/weather/:id/delete", authenticateAdmin, handleDeleteWeather);

//! Route to delete all dates
router.post("/dates/deleteAll", authenticateAdmin, handleDeleteWeatherDates);

//! Route that requests all information in the database to be deleted
router.post("/deleteAll", authenticateAdmin, handleDeleteAll);

// MongoExpress UI
router.use("/mongo-express", authenticateAdmin, await mongo_express(mongo_express_config));

export default router;