import { Router } from "express";
import { authenticateAdmin } from "../../utils/routes.js";
import { getRegionsPage, getWeatherPage, handleCalculateCenters, handleDeleteRegion, handleDeleteRegions, handleDeleteWeatherRegion, handleGetRegionFields, handleGetRegions, handleGetRegionWithWeather, handleSaveRegions } from "../../controllers/admin/regions.js";
import multer from "multer";
import { handleGetWeatherFields } from "../../controllers/admin/weather.js";
const router = Router();
// Page that shows Regions
router.get("/regions", authenticateAdmin, getRegionsPage);
// Page that shows weather data for a region
router.get("/regions/:id/weather", authenticateAdmin, getWeatherPage);
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
router.post("/region/calculateCenters", authenticateAdmin, handleCalculateCenters);
export default router;
//# sourceMappingURL=region.js.map