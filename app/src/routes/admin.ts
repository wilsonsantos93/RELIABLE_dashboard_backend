//! Express
import { Router } from "express";

// Controllers
import { getHomePage, getIndexPage, handleDeleteAll } from "../controllers/admin/index.js";
import { handleDeleteWeatherDates } from "../controllers/admin/dates.js"
import { getRegionsPage, handleCalculateCenters, handleDeleteRegion, handleDeleteRegions, handleGetRegionFields, handleGetRegionWithWeather, handleSaveRegions } from "../controllers/admin/regions.js";
import { handleDeleteWeather } from "../controllers/admin/weather.js";
import { getCreateUserPage, getEditUserPage, getUsersPage, handleCreateUser, handleDeleteUser, handleGetUserFields, handleGetUsers, handleUpdateUser } from "../controllers/admin/users.js";
import { getLoginPage, handleLogin, handleLogout } from "../controllers/admin/auth.js";

// Auth
import { authenticateAdmin, forwardAuthenticatedAdmin } from "../utils/routes.js";

// Mongo-Express UI
import mongo_express_config from "../configs/mongo-express.config.js";
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

//! Page that shows users 
router.get("/users", authenticateAdmin, getUsersPage);
// Page to create a new user
router.get("/users/create", authenticateAdmin, getCreateUserPage);
// Route to insert new user
router.post("/users/create", authenticateAdmin, handleCreateUser);
// Page to edit a user
router.get("/users/:id/edit", authenticateAdmin, getEditUserPage);
//! Route to handle user update
router.post("/users/:id/update", authenticateAdmin, handleUpdateUser);
//! Route to get users
router.get("/getUsers", authenticateAdmin, handleGetUsers);
//! Route to delete a user
router.post("/user/:id/delete", authenticateAdmin, handleDeleteUser);
//! Route to get user collection fields
router.get("/user/fields", authenticateAdmin, handleGetUserFields);

// Page that shows Regions
router.get("/regions", authenticateAdmin, getRegionsPage);
//! Page that shows weather data for a region
router.get("/regions/:id/weather", authenticateAdmin, handleGetRegionWithWeather);
// Route to get Region fields
router.get("/regions/fields", authenticateAdmin, handleGetRegionFields);
// Route to delete a specific region
router.post("/regions/:id/delete", authenticateAdmin, handleDeleteRegion);
// Route to delete all regions
router.post("/deleteRegions", authenticateAdmin, handleDeleteRegions);
// Route to upload GeoJSON file
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post("/save", authenticateAdmin, upload.single("geojson"), handleSaveRegions);
// Router to calculate region centers
router.post("/calculateCenters", authenticateAdmin, handleCalculateCenters);


//! Route to delete all weather
router.post("/deleteWeather", authenticateAdmin, handleDeleteWeather);

//! Route to delete all dates
router.post("/deleteWeatherDates", authenticateAdmin, handleDeleteWeatherDates);

//! Route that requests all information in the database to be deleted
router.post("/deleteAll", authenticateAdmin, handleDeleteAll);

// MongoExpress UI
router.use("/mongo-express", authenticateAdmin, await mongo_express(mongo_express_config));

export default router;