import { Router } from "express";
import { authenticateAdmin } from "../../utils/routes.js";
import { getHomePage, getIndexPage, handleDeleteAll } from "../../controllers/admin/home.js";
import regionRouter from "./region.js";
import userRouter from "./user.js";
import weatherRouter from "./weather.js";
import authRouter from "./auth.js";
import metadataRouter from "./metadata.js";

// Mongo-Express UI
import mongo_express_config from "../../configs/mongo-express.config.js";
import { createRequire } from "module";
import { handleDeleteWeatherDates } from "../../controllers/admin/dates.js";
const require = createRequire(import.meta.url);
const mongo_express = require('mongo-express-enhanced/lib/middleware.js');

const router = Router();

// Get root page
router.get('/meta', (req, res) => res.render("metadata.ejs"));  

// Get root page
router.get('/', getIndexPage);  

// Get the home page
router.get("/home", authenticateAdmin, getHomePage);

// Route that requests all information in the database to be deleted
router.post("/deleteAll", authenticateAdmin, handleDeleteAll);

// Route to delete all dates
router.post("/date/deleteAll", authenticateAdmin, handleDeleteWeatherDates);

// MongoExpress UI
router.use("/mongo-express", authenticateAdmin, await mongo_express(mongo_express_config));

router.use("/", regionRouter);
router.use("/", userRouter);
router.use("/", authRouter);
router.use("/", weatherRouter);
router.use("/", metadataRouter);

export default router;