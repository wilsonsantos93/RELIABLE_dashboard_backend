//! Express
import express from "express";

//! Get region borders data route
//! Client sends a geoJSON to be saved to the database
//! Calculate centers of each feature in the database route
import {handleCalculateCenters, handleGetRegionBorders, handleSaveFeatures} from "../controllers/regionBorders.js";
import multer from "multer";

const regionBordersRouter = express.Router();

regionBordersRouter.get("/getRegionBorders", async function (request, response) {
        await handleGetRegionBorders(request, response);
    }
);

const storage = multer.memoryStorage(); // Use RAM to temporarily store the received geoJSON, before parsing it and saving it to the database
const upload = multer({storage: storage});
// https://stackoverflow.com/questions/31530200/node-multer-unexpected-field

regionBordersRouter.post("/saveRegionBorders", upload.single("geojson"),
    async function (request, response) {
        await handleSaveFeatures(request, response);
    }
);

regionBordersRouter.post( "/calculateCenters", async function (request, response) {
        await handleCalculateCenters(request, response);
    }
);

export default regionBordersRouter;