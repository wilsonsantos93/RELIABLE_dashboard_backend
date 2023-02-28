import { Router } from "express";
import { authenticateAPI } from "../../utils/routes.js";
import { saveLocations, updatePassword } from "../../controllers/api/user.js";
import { Role } from "../../types/User.js";

const router = Router();

//! Route that updates the user locations
router.post("/saveLocations", authenticateAPI(Role.USER), saveLocations);

//! Route that updates the user password
router.post("/updatePassword", authenticateAPI(Role.USER), updatePassword);

export default router;