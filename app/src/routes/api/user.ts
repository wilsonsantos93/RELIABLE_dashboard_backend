import { Router } from "express";
import { authenticateAPI } from "../../utils/routes";
import { saveLocations, updatePassword } from "../../controllers/api/user";
import { Role } from "../../types/User";

const router = Router();

//! Route that updates the user locations
router.post("/saveLocations", authenticateAPI(Role.USER), saveLocations);

//! Route that updates the user password
router.post("/updatePassword", authenticateAPI(Role.USER), updatePassword);

export default router;