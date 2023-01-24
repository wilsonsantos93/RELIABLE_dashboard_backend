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
import { Role } from "../models/User.js";
const require = createRequire(import.meta.url);
const mongo_express = require('mongo-express/lib/middleware.js');
const mongo_express_config = require('mongo-express/config.js');

const router = Router();

router.get('/', function (req: Request, res: Response) {
  res.redirect('/admin/login');
});  

router.get('/login', forwardAuthenticatedAdmin, function(req: Request, res: Response) {
  res.render("login.ejs");
});

router.post('/login', passport.authenticate('admin-local', { 
  failureRedirect:'/admin/login',
  successRedirect:'/admin/home',
  failureFlash: true
}));

router.get('/logout', authenticateAdmin, function(req: Request, res: Response, next: NextFunction) {
  req.logout(function(err) {
    if (err) { 
      req.flash('error_message', 'An error occurred.');
      return next();
    }
    req.flash('success_message', 'You are succesfully logged out.');
    return res.redirect('/admin/login');
  });
});

//! Page that allows a client to send geoJSONs to the server, or delete database collections
router.get("/home", authenticateAdmin, function (req: Request, res: Response) {
  res.render("home.ejs");
});

//! Client requests the region borders collection to be deleted
router.post("/deleteRegionBorders", authenticateAdmin, async function (req: Request, res: Response) {
    await handleDeleteRegionBorders(req, res);
  }
);

//! Route that requests the weather saved dates in the database to be deleted
router.post("/deleteWeatherDates", authenticateAdmin, async function (req: Request, res: Response) {
    await handleDeleteWeatherDates(req, res);
  }
);

//! Route that requests the weather information in the database to be deleted
router.post("/deleteWeather", authenticateAdmin, async function (req: Request, res: Response) {
    await handleDeleteWeather(req, res);
  }
);

//! Route that requests the weather information in the database to be deleted
router.post("/deleteAll", authenticateAdmin, async function (req: Request, res: Response) {
  await handleDeleteAll(req, res);
});


// MongoExpress UI
router.use("/mongo-express", authenticateAdmin, await mongo_express(mongo_express_config));


export default router;