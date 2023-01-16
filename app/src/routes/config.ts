//! Express
import { Router } from "express";
import {
  handleDeleteAll,
  handleDeleteRegionBorders,
  handleDeleteWeather,
  handleDeleteWeatherDates
} from "../controllers/config.js";
import {Request, Response} from "express-serve-static-core";
import passport from "../auth/index.js";

const configRouter = Router();

//! Page that allows a client to send geoJSONs to the server, or delete database collections
configRouter.get("/config", passport.authenticate('admin-local'), function (request: Request, response: Response) {
  response.sendFile("config.html", { root: "./src/views" });
});

//! Client requests the region borders collection to be deleted
configRouter.post("/deleteRegionBorders", passport.authenticate('admin-local'),
  async function (request: Request, response: Response) {
    await handleDeleteRegionBorders(request, response);
  }
);

//! Route that requests the weather saved dates in the database to be deleted
configRouter.post("/deleteWeatherDates", passport.authenticate('admin-local'),
  async function (request: Request, response: Response) {
    await handleDeleteWeatherDates(request, response);
  }
);

//! Route that requests the weather information in the database to be deleted
configRouter.post("/deleteWeather", passport.authenticate('admin-local'),
  async function (request: Request, response: Response) {
    await handleDeleteWeather(request, response);
  }
);

//! Route that requests the weather information in the database to be deleted
configRouter.post("/deleteAll", passport.authenticate('admin-local'), async function (request: Request, response: Response) {
  await handleDeleteAll(request, response);
});

export default configRouter;