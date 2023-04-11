import { Router } from "express";
import { handleDeleteWeather, handleDeleteAllWeather } from "../../controllers/admin/weather.js";
import { authenticateAdmin } from "../../utils/routes.js";
const router = Router();
//! Route to delete all weather
router.post("/weather/deleteAll", authenticateAdmin, handleDeleteAllWeather);
//! Route to delete specific weather
router.post("/weather/:id/delete", authenticateAdmin, handleDeleteWeather);
export default router;
//# sourceMappingURL=weather.js.map