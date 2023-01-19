//! Express
import { NextFunction, Router } from "express";
import {
  handleDeleteAll,
  handleDeleteRegionBorders,
  handleDeleteWeather,
  handleDeleteWeatherDates
} from "../controllers/config.js";
import { Request, Response } from "express-serve-static-core";
import { authenticateAdmin, forwardAuthenticatedAdmin } from "../utils/routes.js";
import passport from "passport";

// Mongo-Express UI imports
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mongo_express = require('mongo-express/lib/middleware.js');
const mongo_express_config = require('mongo-express/config.js');

const configRouter = Router();

configRouter.get('/', function (request: Request, response: Response) {
  response.redirect('/admin/login');
});  

configRouter.get('/login', forwardAuthenticatedAdmin, function(request: Request, response: Response) {
  response.render("login.ejs");
});

configRouter.post('/login', passport.authenticate('admin-local', { 
  failureRedirect:'/admin/login',
  successRedirect:'/admin/config',
  failureFlash: true
}));

configRouter.get('/logout', authenticateAdmin, function(request: Request, response: Response, next: NextFunction) {
  request.logout(function(err) {
    if (err) { 
      request.flash('error', 'An error occurred.');
      return next();
    }
    request.flash('success_alert_message', 'You are succesfully logged out');
    return response.redirect('/admin/login');
  });
});

//! Page that allows a client to send geoJSONs to the server, or delete database collections
configRouter.get("/config", authenticateAdmin, function (request: Request, response: Response) {
  response.render("config.ejs");
});

//! Client requests the region borders collection to be deleted
configRouter.post("/deleteRegionBorders", authenticateAdmin, async function (request: Request, response: Response) {
    await handleDeleteRegionBorders(request, response);
  }
);

//! Route that requests the weather saved dates in the database to be deleted
configRouter.post("/deleteWeatherDates", authenticateAdmin, async function (request: Request, response: Response) {
    await handleDeleteWeatherDates(request, response);
  }
);

//! Route that requests the weather information in the database to be deleted
configRouter.post("/deleteWeather", authenticateAdmin, async function (request: Request, response: Response) {
    await handleDeleteWeather(request, response);
  }
);

//! Route that requests the weather information in the database to be deleted
configRouter.post("/deleteAll", authenticateAdmin, async function (request: Request, response: Response) {
  await handleDeleteAll(request, response);
});


// MongoExpress UI
configRouter.use("/mongo-express", authenticateAdmin, await mongo_express(mongo_express_config));


export default configRouter;