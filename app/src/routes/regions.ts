//! Express
import express from "express";

//! Get region borders data route
//! Client sends a geoJSON to be saved to the database
//! Calculate centers of each feature in the database route
import {
  handleGetRegionBorders,
} from "../controllers/api/regions.js";
import { authenticateAdmin, authenticateAPI } from "../utils/routes.js";
import { Role } from "../models/User.js";

const router = express.Router();

router.get("/", authenticateAPI(), async function (request, response) {
  await handleGetRegionBorders(request, response);
});


export default router;
