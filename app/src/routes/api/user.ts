import { Router } from "express";
import { authenticateAPI } from "../../utils/routes.js";
import { getAlerts, saveLocations, updatePassword, getLocations, createLocation, updateLocation, deleteLocation } from "../../controllers/api/user.js";
import { Role } from "../../types/User.js";

const router = Router();

// Route that updates the user locations
router.post("/saveLocations", authenticateAPI(Role.USER), saveLocations);

// Route that updates the user password
router.post("/updatePassword", authenticateAPI(Role.USER), updatePassword);

// Route that gets user locations
router.get("/location", authenticateAPI(Role.USER), getLocations);

// Route that adds a new location on the user
router.post("/location", authenticateAPI(Role.USER), createLocation);

// Route that updates a location on the user
router.post("/location/:id/update", authenticateAPI(Role.USER), updateLocation);

// Route that deletes a location on the user
router.post("/location/:id/delete",  authenticateAPI(Role.USER), deleteLocation);

// Route that gets a location on the user
router.get("/alerts",  getAlerts);

export default router;