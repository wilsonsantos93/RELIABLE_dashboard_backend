//! Express
import { Router } from "express";
const router = Router();
//! Get proj4.js library route
router.get("/proj4.js", function (_request, response) {
    response.sendFile("proj4.js", { root: "./src/libs" });
});
//! Get proj4leaflet.js library route
router.get("/proj4leaflet.js", function (_request, response) {
    response.sendFile("proj4leaflet.js", { root: "./src/libs" });
});
export default router;
//# sourceMappingURL=libraries.js.map